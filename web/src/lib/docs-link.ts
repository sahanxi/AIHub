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

const DEFAULT_DOCS_PATH = '/docs'
const LEGACY_UPSTREAM_DOCS_HOSTS = new Set(['docs.newapi.pro'])

export function resolveDocsLink(rawLink: unknown) {
  const value = typeof rawLink === 'string' ? rawLink.trim() : ''
  if (!value) return { href: DEFAULT_DOCS_PATH, external: false }

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { href: DEFAULT_DOCS_PATH, external: false }
    }
    if (LEGACY_UPSTREAM_DOCS_HOSTS.has(url.hostname.toLocaleLowerCase())) {
      return { href: DEFAULT_DOCS_PATH, external: false }
    }
    return { href: url.toString(), external: true }
  } catch {
    return {
      href: value.startsWith('/') ? value : DEFAULT_DOCS_PATH,
      external: false,
    }
  }
}
