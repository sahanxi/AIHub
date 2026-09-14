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
import { useMemo } from 'react'

import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'

import {
  buildHomeModelNames,
  buildHomeVendorMarks,
} from '../lib/home-vendor-display'

export function useHomeCatalog() {
  const { models, vendors, isLoading } = usePricingData()

  const vendorMarks = useMemo(
    () => buildHomeVendorMarks(models, vendors),
    [models, vendors]
  )

  const modelNames = useMemo(() => buildHomeModelNames(models), [models])

  return {
    vendorMarks,
    modelNames,
    isLoading,
  }
}
