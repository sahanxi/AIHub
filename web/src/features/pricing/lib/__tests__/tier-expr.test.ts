/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  evalExprLocally,
  generateExprFromVisualConfig,
  normalizeVisualTier,
  tryParseVisualConfig,
  type ExtraTokenValues,
  type VisualConfig,
} from '../tier-expr'

const emptyExtras: ExtraTokenValues = {
  cacheReadTokens: 0,
  cacheCreateTokens: 0,
  cacheCreate1hTokens: 0,
  imageTokens: 0,
  imageOutputTokens: 0,
  audioInputTokens: 0,
  audioOutputTokens: 0,
}

const LUNA_EXPR =
  'len <= 272000 ? tier("base", p * 0.20 + c * 1.20 + cr * 0.02 + cc * 0.25) : tier("long_context", p * 0.40 + c * 1.80 + cr * 0.04 + cc * 0.50)'

const lunaVisualConfig: VisualConfig = {
  tiers: [
    normalizeVisualTier({
      label: 'base',
      conditions: [{ var: 'len', op: '<=', value: 272000 }],
      input_unit_cost: 0.2,
      output_unit_cost: 1.2,
      cache_read_unit_cost: 0.02,
      cache_create_unit_cost: 0.25,
    }),
    normalizeVisualTier({
      label: 'long_context',
      conditions: [],
      input_unit_cost: 0.4,
      output_unit_cost: 1.8,
      cache_read_unit_cost: 0.04,
      cache_create_unit_cost: 0.5,
    }),
  ],
}

describe('billing expression local preview', () => {
  test('does not use the Function constructor when previewing a tiered expression', () => {
    const OriginalFunction = globalThis.Function
    globalThis.Function = function ForbiddenFunction() {
      throw new Error('Function constructor is forbidden under CSP')
    } as unknown as FunctionConstructor
    try {
      const result = evalExprLocally(LUNA_EXPR, 272000, 0, emptyExtras)
      assert.equal(result.error, null)
      assert.equal(result.matchedTier, 'base')
    } finally {
      globalThis.Function = OriginalFunction
    }
  })

  test('selects base when len is 272000 and long_context when len is 272001', () => {
    const atBoundary = evalExprLocally(LUNA_EXPR, 272000, 0, emptyExtras)
    assert.equal(atBoundary.error, null)
    assert.equal(atBoundary.matchedTier, 'base')
    assert.equal(atBoundary.cost, 272000 * 0.2)

    const pastBoundary = evalExprLocally(LUNA_EXPR, 272001, 0, emptyExtras)
    assert.equal(pastBoundary.error, null)
    assert.equal(pastBoundary.matchedTier, 'long_context')
    assert.equal(pastBoundary.cost, 272001 * 0.4)
  })

  test('round-trips the GPT-5.6 Luna visual config and previews the same tiers', () => {
    const generated = generateExprFromVisualConfig(lunaVisualConfig)
    const parsed = tryParseVisualConfig(generated)
    assert.ok(parsed)
    assert.equal(
      generateExprFromVisualConfig(parsed).replaceAll(/\s+/g, ''),
      generated.replaceAll(/\s+/g, '')
    )

    const atBoundary = evalExprLocally(generated, 272000, 100, emptyExtras)
    assert.equal(atBoundary.error, null)
    assert.equal(atBoundary.matchedTier, 'base')
    assert.equal(atBoundary.cost, 272000 * 0.2 + 100 * 1.2)

    const pastBoundary = evalExprLocally(generated, 272001, 100, emptyExtras)
    assert.equal(pastBoundary.error, null)
    assert.equal(pastBoundary.matchedTier, 'long_context')
    assert.equal(pastBoundary.cost, 272001 * 0.4 + 100 * 1.8)
  })

  test('opens a Luna expression with trailing-zero prices in the visual editor', () => {
    const parsed = tryParseVisualConfig(LUNA_EXPR)
    assert.ok(parsed)
    assert.equal(parsed.tiers.length, 2)
    assert.equal(parsed.tiers[0]?.label, 'base')
    assert.deepEqual(parsed.tiers[0]?.conditions, [
      { var: 'len', op: '<=', value: 272000 },
    ])
    assert.equal(parsed.tiers[0]?.input_unit_cost, 0.2)
    assert.equal(parsed.tiers[0]?.output_unit_cost, 1.2)
    assert.equal(parsed.tiers[0]?.cache_read_unit_cost, 0.02)
    assert.equal(parsed.tiers[0]?.cache_create_unit_cost, 0.25)
    assert.equal(parsed.tiers[1]?.label, 'long_context')
    assert.equal(parsed.tiers[1]?.input_unit_cost, 0.4)
    assert.equal(parsed.tiers[1]?.output_unit_cost, 1.8)
    assert.equal(parsed.tiers[1]?.cache_read_unit_cost, 0.04)
    assert.equal(parsed.tiers[1]?.cache_create_unit_cost, 0.5)
    assert.deepEqual(parsed.tiers[1]?.conditions, [])
  })

  test('returns an error for invalid syntax without throwing', () => {
    const result = evalExprLocally(
      'len <= 272000 ? tier("base", p * 0.2',
      1,
      0,
      emptyExtras
    )
    assert.ok(result.error)
    assert.equal(result.matchedTier, '')
    assert.equal(result.cost, 0)
  })

  test('rejects identifiers that would require dynamic JavaScript evaluation', () => {
    const result = evalExprLocally('constructor', 1, 0, emptyExtras)
    assert.ok(result.error)
    assert.match(result.error ?? '', /Unknown identifier/)
  })

  test('selects the matching branch for combined len and completion conditions', () => {
    const expr =
      'len < 32000 && c < 200 ? tier("short_output", p * 0.8 + c * 2) : tier("long_output", p * 0.8 + c * 6)'
    const shortOutput = evalExprLocally(expr, 1000, 100, emptyExtras)
    assert.equal(shortOutput.error, null)
    assert.equal(shortOutput.matchedTier, 'short_output')

    const longOutput = evalExprLocally(expr, 1000, 200, emptyExtras)
    assert.equal(longOutput.error, null)
    assert.equal(longOutput.matchedTier, 'long_output')
  })
})
