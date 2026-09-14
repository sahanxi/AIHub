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
import type { PricingModel } from '../types'
import { getPricingModelVendorName } from './model-vendor'

const VENDOR_CATALOG_ORDER = [
  'OpenAI',
  'Google',
  'Gemini',
  'Anthropic',
  'Amazon',
  'AWS',
  'Mistral',
  'xAI',
  'Other',
] as const

export function isModelAvailable(model: PricingModel): boolean {
  return model.available !== false
}

export function getVendorCatalogTier(model: PricingModel): number {
  const vendor = getPricingModelVendorName(model)
  if (vendor === 'OpenAI') return 0
  if (vendor === 'Google' || vendor === 'Gemini') return 1
  return 2
}

export function getVendorCatalogRank(vendorName: string): number {
  const index = VENDOR_CATALOG_ORDER.indexOf(
    vendorName as (typeof VENDOR_CATALOG_ORDER)[number]
  )
  return index === -1 ? VENDOR_CATALOG_ORDER.length : index
}

export function getModelReleaseScore(model: PricingModel): number {
  if (model.release_date) {
    const timestamp = Date.parse(model.release_date)
    if (!Number.isNaN(timestamp)) {
      return timestamp
    }
  }

  const name = model.model_name.toLowerCase()
  const parts = name.match(/\d+(?:\.\d+)*/g)?.map(Number) ?? []
  let score = 0

  for (let index = 0; index < parts.length; index++) {
    score += parts[index] * 1000 ** (parts.length - 1 - index)
  }

  if (
    /gpt-6(?:\.|\s|$)|gpt-5(?:\.\d+|\s|$)|gpt-4o/.test(name)
  ) {
    score += 10_000
  }
  if (/gemini\s*3\.[678]|gemini\s*3\.1\s*pro/.test(name)) {
    score += 8_000
  }
  if (/grok\s*4\.[56]|opus-5|sonnet-5/.test(name)) {
    score += 6_000
  }
  if (/astra|terra/.test(name)) score += 120
  if (/sol|luna/.test(name)) score += 80
  if (/pro(?!\s*mini)/.test(name)) score += 60
  if (/flash/.test(name)) score += 40
  if (/mini|lite|small|haiku/.test(name)) score -= 30

  return score
}

export function compareModelsByCatalogOrder(
  a: PricingModel,
  b: PricingModel
): number {
  const availabilityDelta =
    Number(isModelAvailable(a)) - Number(isModelAvailable(b))
  if (availabilityDelta !== 0) {
    return -availabilityDelta
  }

  const tierDelta = getVendorCatalogTier(a) - getVendorCatalogTier(b)
  if (tierDelta !== 0) {
    return tierDelta
  }

  const releaseDelta = getModelReleaseScore(b) - getModelReleaseScore(a)
  if (releaseDelta !== 0) {
    return releaseDelta
  }

  return (a.model_name || '').localeCompare(b.model_name || '', undefined, {
    sensitivity: 'base',
  })
}

export function sortModelsByCatalogOrder(
  models: PricingModel[]
): PricingModel[] {
  return [...models].sort(compareModelsByCatalogOrder)
}
