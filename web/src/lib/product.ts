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
/**
 * Product-layer branding fallbacks.
 *
 * Runtime name, logo, footer, and docs still come from New API
 * SystemName / Logo / Footer / docs_link. Do not scatter candidate
 * product names through components — change these constants (or admin
 * Site settings) in one place.
 */
export const PRODUCT_FALLBACK_NAME = 'AI API Platform'
export const PRODUCT_FALLBACK_SHORT_NAME = 'AI API'
export const PRODUCT_FALLBACK_DESCRIPTION =
  'One API for GPT, Claude, and Gemini. Unified keys, CNY balance, and usage.'
export const PRODUCT_FALLBACK_LOGO = '/logo.png'
export const DEV_API_BASE_URL = 'http://127.0.0.1:3000'

/** V1.1 surfaces — keep backend, hide user UI until enabled. */
export const V1_SHOW_AFFILIATE = false
export const V1_SHOW_SUBSCRIPTION = false
export const V1_SHOW_PLAYGROUND = false

function isRawIpHostname(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

/**
 * Public Base URL used in docs and code samples.
 * Never advertise a public IPv4 as the official API host.
 */
export function getPublicApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return DEV_API_BASE_URL
  }
  try {
    const origin = window.location.origin
    const hostname = window.location.hostname
    if (!origin || hostname === 'localhost' || hostname === '127.0.0.1') {
      return DEV_API_BASE_URL
    }
    if (isRawIpHostname(hostname)) {
      return DEV_API_BASE_URL
    }
    return origin
  } catch {
    return DEV_API_BASE_URL
  }
}

export function getPublicOpenAIBaseUrl(): string {
  return `${getPublicApiBaseUrl().replace(/\/+$/, '')}/v1`
}
