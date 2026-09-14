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
import { getModelCategory } from '@/features/channels/lib/model-categories'

import type { PricingModel, PricingVendor } from '../types'

const VENDOR_DISPLAY_NAMES: Record<string, string> = {
  Gemini: 'Google',
  Amazon: 'AWS',
}

const VENDOR_ICON_FALLBACKS: Record<string, string> = {
  Anthropic: 'Claude.Color',
  AWS: 'Aws',
  Google: 'Gemini.Color',
  Mistral: 'Mistral.Color',
  OpenAI: 'OpenAI',
  xAI: 'XAI',
}

export function getPricingModelVendorName(model: PricingModel): string {
  const fromApi = model.vendor_name?.trim()
  if (fromApi) {
    return fromApi
  }
  const inferred = getModelCategory(model.model_name)
  return VENDOR_DISPLAY_NAMES[inferred] ?? inferred
}

export function buildPricingVendorOptions(
  models: PricingModel[],
  vendors: PricingVendor[]
): Array<{ name: string; icon?: string }> {
  const vendorByName = new Map(
    vendors.map((vendor) => [vendor.name, vendor] as const)
  )
  const names = new Set<string>()

  for (const model of models) {
    names.add(getPricingModelVendorName(model))
  }

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const vendor = vendorByName.get(name)
      return {
        name,
        icon: vendor?.icon ?? VENDOR_ICON_FALLBACKS[name],
      }
    })
}
