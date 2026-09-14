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
import { buildPricingVendorOptions } from '@/features/pricing/lib/model-vendor'
import { sortModelsByCatalogOrder } from '@/features/pricing/lib/model-catalog-order'
import type { PricingModel, PricingVendor } from '@/features/pricing/types'

import { HOME_LIVE_MODELS, HOME_LIVE_VENDORS } from '../constants'

export type HomeVendorMark = {
  name: string
  hint: string
  icon: string
}

const HOME_VENDOR_DISPLAY: Record<
  string,
  Pick<HomeVendorMark, 'name' | 'hint' | 'icon'>
> = {
  OpenAI: { name: 'ChatGPT', hint: 'OpenAI', icon: 'OpenAI.Color' },
  Google: { name: 'Gemini', hint: 'Google', icon: 'Gemini.Color' },
  Gemini: { name: 'Gemini', hint: 'Google', icon: 'Gemini.Color' },
  Anthropic: { name: 'Claude', hint: 'Anthropic', icon: 'Claude.Color' },
  xAI: { name: 'Grok', hint: 'xAI', icon: 'Grok.Color' },
  AWS: { name: 'AWS', hint: 'Amazon', icon: 'Aws' },
  Amazon: { name: 'AWS', hint: 'Amazon', icon: 'Aws' },
  Mistral: { name: 'Mistral', hint: 'Mistral', icon: 'Mistral.Color' },
}

const FALLBACK_VENDOR_MARKS: HomeVendorMark[] = HOME_LIVE_VENDORS.map(
  (vendor) => ({
    name: vendor.name,
    hint: vendor.hint,
    icon: vendor.icon,
  })
)

export function toHomeVendorMark(vendor: {
  name: string
  icon?: string
}): HomeVendorMark {
  const display = HOME_VENDOR_DISPLAY[vendor.name]
  if (display) {
    return display
  }

  return {
    name: vendor.name,
    hint: vendor.name,
    icon: vendor.icon ?? 'OpenAI',
  }
}

export function buildHomeVendorMarks(
  models: PricingModel[],
  vendors: PricingVendor[]
): HomeVendorMark[] {
  if (!models.length) {
    return FALLBACK_VENDOR_MARKS
  }

  return buildPricingVendorOptions(models, vendors).map((vendor) =>
    toHomeVendorMark(vendor)
  )
}

export function buildHomeModelNames(models: PricingModel[]): string[] {
  if (!models.length) {
    return [...HOME_LIVE_MODELS]
  }

  return sortModelsByCatalogOrder(models)
    .slice(0, 15)
    .map((model) => model.model_name)
}
