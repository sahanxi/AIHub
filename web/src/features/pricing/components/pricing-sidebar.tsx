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
import { ChevronDown, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { FILTER_ALL } from '../constants'
import {
  MODEL_CLASSIFICATIONS,
  getModelClassification,
  getModelClassificationLabels,
  listModelClassifications,
} from '../lib/model-classification'
import { buildPricingVendorOptions } from '../lib/model-vendor'
import type { PricingModel, PricingVendor } from '../types'

type FilterOption = {
  value: string
  label: string
  count?: number
  suffix?: string
  icon?: ReactNode
}

type FilterSectionProps = {
  title: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

export interface PricingSidebarProps {
  modelClassificationFilter: string
  vendorFilter: string
  onModelClassificationChange: (value: string) => void
  onVendorChange: (value: string) => void
  vendors: PricingVendor[]
  models: PricingModel[]
  hasActiveFilters: boolean
  onClearFilters: () => void
  className?: string
}

function countBy(
  models: PricingModel[],
  predicate: (model: PricingModel) => boolean
): number {
  return models.reduce((count, model) => count + (predicate(model) ? 1 : 0), 0)
}

function isAggregateFilterOption(value: string): boolean {
  return value === FILTER_ALL
}

function FilterChip(props: {
  option: FilterOption
  active: boolean
  onClick: () => void
  variant?: 'aggregate' | 'category'
}) {
  const meta = props.option.suffix ?? props.option.count
  const chipVariant = props.variant ?? 'category'

  return (
    <Button
      type='button'
      variant='outline'
      size='default'
      onClick={props.onClick}
      aria-pressed={props.active}
      className={cn(
        'flex h-9 w-full items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium whitespace-nowrap shadow-none transition-all',
        chipVariant === 'aggregate' && 'max-w-full',
        props.active
          ? 'border-foreground/15 bg-foreground text-background hover:bg-foreground/90 hover:text-background'
          : 'bg-background text-foreground hover:border-foreground/20 hover:bg-muted/70'
      )}
    >
      {props.option.icon && (
        <span className='shrink-0'>{props.option.icon}</span>
      )}
      <span className='text-center'>{props.option.label}</span>
      {meta != null && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums',
            props.active
              ? 'bg-background/20 text-background'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {meta}
        </span>
      )}
    </Button>
  )
}

function FilterSection(props: FilterSectionProps) {
  const aggregateOption = props.options.find((option) =>
    isAggregateFilterOption(option.value)
  )
  const categoryOptions = props.options.filter(
    (option) => !isAggregateFilterOption(option.value)
  )

  return (
    <Collapsible
      defaultOpen
      className='border-border/70 border-b pb-3 last:border-b-0'
    >
      <CollapsibleTrigger className='group flex w-full items-center justify-between py-2.5 text-left'>
        <span className='text-foreground text-sm font-semibold'>
          {props.title}
        </span>
        <ChevronDown className='text-muted-foreground size-4 transition-transform group-data-[panel-open]:rotate-180' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className='space-y-2'>
          {aggregateOption && (
            <FilterChip
              option={aggregateOption}
              active={props.value === aggregateOption.value}
              onClick={() => props.onChange(aggregateOption.value)}
              variant='aggregate'
            />
          )}
          {categoryOptions.length > 0 && (
            <div className='grid grid-cols-2 gap-2'>
              {categoryOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  option={option}
                  active={props.value === option.value}
                  onClick={() => props.onChange(option.value)}
                  variant='category'
                />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function PricingSidebar(props: PricingSidebarProps) {
  const { t } = useTranslation()
  const classificationLabels = getModelClassificationLabels(t)
  const vendorOptionsList = useMemo(
    () => buildPricingVendorOptions(props.models, props.vendors),
    [props.models, props.vendors]
  )

  const vendorOptions: FilterOption[] = [
    {
      value: FILTER_ALL,
      label: t('All Vendors'),
      count: props.models.length,
    },
    ...vendorOptionsList.map((vendor) => ({
      value: vendor.name,
      label: vendor.name,
      icon: vendor.icon ? getLobeIcon(vendor.icon, 14) : undefined,
    })),
  ]

  const classificationOptions: FilterOption[] = [
    {
      value: MODEL_CLASSIFICATIONS.ALL,
      label: classificationLabels[MODEL_CLASSIFICATIONS.ALL],
      count: props.models.length,
    },
    ...listModelClassifications()
      .filter((classification) =>
        countBy(
          props.models,
          (model) => getModelClassification(model) === classification
        )
      )
      .map((classification) => ({
        value: classification,
        label: classificationLabels[classification],
      })),
  ]

  return (
    <aside className={cn('bg-card rounded-xl border p-3', props.className)}>
      <div className='mb-2.5 flex items-center justify-between gap-2'>
        <div>
          <h2 className='text-foreground text-sm font-bold'>{t('Filter')}</h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Refine models by provider and model classification.')}
          </p>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={props.onClearFilters}
          disabled={!props.hasActiveFilters}
          className='h-7 gap-1.5 px-2 text-xs'
        >
          <RotateCcw className='size-3.5' />
          {t('Reset')}
        </Button>
      </div>

      {props.hasActiveFilters && (
        <Badge variant='secondary' className='mb-3'>
          {t('Filters active')}
        </Badge>
      )}

      <div className='space-y-1'>
        <FilterSection
          title={t('All Vendors')}
          value={props.vendorFilter}
          options={vendorOptions}
          onChange={props.onVendorChange}
        />
        <FilterSection
          title={t('Model Classification')}
          value={props.modelClassificationFilter}
          options={classificationOptions}
          onChange={props.onModelClassificationChange}
        />
      </div>
    </aside>
  )
}
