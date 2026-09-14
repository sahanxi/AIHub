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
import { useSearch } from '@tanstack/react-router'
import { useMemo, useCallback, useState } from 'react'

import { useDebounce } from '@/hooks/use-debounce'

import {
  FILTER_ALL,
  SORT_OPTIONS,
  ENDPOINT_TYPES,
  DEFAULT_TOKEN_UNIT,
  VIEW_MODES,
  type ViewMode,
} from '../constants'
import { filterAndSortModels } from '../lib/filters'
import type { PricingModel, TokenUnit } from '../types'

type FilterState = {
  search?: string
  sort?: string
  vendor?: string
  group?: string
  taskCategory?: string
  endpointType?: string
  tokenUnit?: TokenUnit
  view?: ViewMode
  rechargePrice?: boolean
}

function normalizeViewMode(value: unknown): ViewMode {
  if (value === VIEW_MODES.TABLE) {
    return VIEW_MODES.TABLE
  }
  return VIEW_MODES.CARD
}

export function useFilters(models: PricingModel[]) {
  const search = useSearch({ from: '/pricing/' })
  const [filterState, setFilterState] = useState<FilterState>(() => ({
    search: search.search,
    sort: search.sort,
    vendor: search.vendor,
    group: search.group,
    taskCategory: search.taskCategory,
    endpointType: search.endpointType,
    tokenUnit: search.tokenUnit,
    view: search.view,
    rechargePrice: search.rechargePrice,
  }))

  const searchInput = filterState.search || ''
  const debouncedSearchInput = useDebounce(searchInput, 200)
  const sortBy = filterState.sort || SORT_OPTIONS.NAME
  const vendorFilter = filterState.vendor || FILTER_ALL
  const groupFilter = filterState.group || FILTER_ALL
  const taskCategoryFilter = filterState.taskCategory || FILTER_ALL
  const endpointTypeFilter = filterState.endpointType || ENDPOINT_TYPES.ALL
  const tokenUnit: TokenUnit =
    filterState.tokenUnit === 'K' ? 'K' : DEFAULT_TOKEN_UNIT
  const viewMode = normalizeViewMode(filterState.view)
  const showRechargePrice = filterState.rechargePrice === true

  const updateFilters = useCallback((updates: Record<string, unknown>) => {
    setFilterState((prev) => {
      const next: Record<string, unknown> = { ...prev, ...updates }
      for (const key of Object.keys(next)) {
        if (next[key] === undefined || next[key] === null) {
          delete next[key]
        }
      }
      return next as FilterState
    })
  }, [])

  const setSearchInput = useCallback(
    (v: string) => updateFilters({ search: v || undefined }),
    [updateFilters]
  )
  const setSortBy = useCallback(
    (v: string) =>
      updateFilters({ sort: v === SORT_OPTIONS.NAME ? undefined : v }),
    [updateFilters]
  )
  const setVendorFilter = useCallback(
    (v: string) => updateFilters({ vendor: v === FILTER_ALL ? undefined : v }),
    [updateFilters]
  )
  const setGroupFilter = useCallback(
    (v: string) => updateFilters({ group: v === FILTER_ALL ? undefined : v }),
    [updateFilters]
  )
  const setTaskCategoryFilter = useCallback(
    (v: string) =>
      updateFilters({ taskCategory: v === FILTER_ALL ? undefined : v }),
    [updateFilters]
  )
  const setEndpointTypeFilter = useCallback(
    (v: string) =>
      updateFilters({
        endpointType: v === ENDPOINT_TYPES.ALL ? undefined : v,
      }),
    [updateFilters]
  )
  const setTokenUnit = useCallback(
    (v: TokenUnit) =>
      updateFilters({ tokenUnit: v === DEFAULT_TOKEN_UNIT ? undefined : v }),
    [updateFilters]
  )
  const setViewMode = useCallback(
    (v: ViewMode) =>
      updateFilters({ view: v === VIEW_MODES.CARD ? undefined : v }),
    [updateFilters]
  )
  const setShowRechargePrice = useCallback(
    (v: boolean) => updateFilters({ rechargePrice: v || undefined }),
    [updateFilters]
  )

  const filteredModels = useMemo(() => {
    if (!models || models.length === 0) return []

    return filterAndSortModels(models, {
      search: debouncedSearchInput,
      vendor: vendorFilter,
      group: groupFilter,
      taskCategory: taskCategoryFilter,
      endpointType: endpointTypeFilter,
      sortBy,
    })
  }, [
    models,
    debouncedSearchInput,
    vendorFilter,
    groupFilter,
    taskCategoryFilter,
    endpointTypeFilter,
    sortBy,
  ])

  const hasActiveFilters = useMemo(
    () =>
      vendorFilter !== FILTER_ALL ||
      groupFilter !== FILTER_ALL ||
      taskCategoryFilter !== FILTER_ALL ||
      endpointTypeFilter !== ENDPOINT_TYPES.ALL,
    [vendorFilter, groupFilter, taskCategoryFilter, endpointTypeFilter]
  )

  const activeFilterCount = useMemo(
    () =>
      (vendorFilter !== FILTER_ALL ? 1 : 0) +
      (groupFilter !== FILTER_ALL ? 1 : 0) +
      (taskCategoryFilter !== FILTER_ALL ? 1 : 0) +
      (endpointTypeFilter !== ENDPOINT_TYPES.ALL ? 1 : 0),
    [vendorFilter, groupFilter, taskCategoryFilter, endpointTypeFilter]
  )

  const clearFilters = useCallback(() => {
    updateFilters({
      vendor: undefined,
      group: undefined,
      taskCategory: undefined,
      endpointType: undefined,
    })
  }, [updateFilters])

  const clearSearch = useCallback(() => {
    updateFilters({ search: undefined })
  }, [updateFilters])

  return {
    searchInput,
    sortBy,
    vendorFilter,
    groupFilter,
    taskCategoryFilter,
    endpointTypeFilter,
    tokenUnit,
    viewMode,
    showRechargePrice,
    setSearchInput,
    setSortBy,
    setVendorFilter,
    setGroupFilter,
    setTaskCategoryFilter,
    setEndpointTypeFilter,
    setTokenUnit,
    setViewMode,
    setShowRechargePrice,
    filteredModels,
    hasActiveFilters,
    activeFilterCount,
    clearFilters,
    clearSearch,
  }
}
