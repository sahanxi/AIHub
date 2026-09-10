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
import { describe, expect, it } from 'vitest'

import { resolveDocsLink } from '../docs-link'

describe('resolveDocsLink', () => {
  it.each([
    undefined,
    '',
    'docs.newapi.pro',
    'https://docs.newapi.pro/api/',
    'javascript:alert(1)',
  ])(
    'uses the local reference for a missing or legacy upstream link: %s',
    (value) => {
      expect(resolveDocsLink(value)).toEqual({
        href: '/docs',
        external: false,
      })
    }
  )

  it('keeps an administrator-configured internal link', () => {
    expect(resolveDocsLink('/help/api')).toEqual({
      href: '/help/api',
      external: false,
    })
  })

  it('keeps an administrator-configured external link', () => {
    expect(resolveDocsLink('https://developer.example.com/reference')).toEqual({
      href: 'https://developer.example.com/reference',
      external: true,
    })
  })
})
