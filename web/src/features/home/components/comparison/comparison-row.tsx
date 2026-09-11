import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { ComparisonCell } from './comparison-cell'
import type { ComparisonRowKey } from './comparison-config'
import { comparisonTheme as theme } from './comparison-theme'

interface ComparisonRowProps {
  rowKey: ComparisonRowKey
  icon: LucideIcon
  className?: string
}

export function ComparisonRow(props: ComparisonRowProps) {
  const { t } = useTranslation()
  const Icon = props.icon
  const label = t(`home.comparison.${props.rowKey}.label`)

  return (
    <div
      className={cn('border-t first:border-t-0', props.className)}
      style={{ borderColor: theme.rowBorder }}
    >
      <div className='space-y-3 px-4 py-4'>
        <div className='flex items-start gap-2.5'>
          <span
            className='flex size-8 shrink-0 items-center justify-center rounded-full'
            style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}
          >
            <Icon
              className='size-4 stroke-[1.6]'
              style={{ color: theme.labelIcon }}
              aria-hidden='true'
            />
          </span>
          <h3
            className='pt-0.5 text-[15px] font-semibold'
            style={{ color: theme.title }}
          >
            {label}
          </h3>
        </div>

        <div
          className='rounded-2xl border p-3'
          style={{
            background: theme.aihubCardBg,
            borderColor: theme.aihubCardBorder,
            boxShadow: theme.aihubCardGlow,
          }}
        >
          <p
            className='mb-2 text-[11px] font-semibold tracking-wide uppercase'
            style={{ color: theme.titleBrand }}
          >
            {t('home.comparison.aihub')}
          </p>
          <ComparisonCell
            tone='aihub'
            icon={Icon}
            emphasized
            title={t(`home.comparison.${props.rowKey}.aihubTitle`)}
            description={t(`home.comparison.${props.rowKey}.aihubDescription`)}
            className='px-0 py-0'
          />
        </div>

        <p
          className='text-center text-[11px] font-medium tracking-[0.18em] uppercase'
          style={{ color: theme.promoSecondary }}
        >
          {t('home.comparison.vs')}
        </p>

        <div
          className='rounded-2xl border p-3'
          style={{
            background: theme.competitorColumnBg,
            borderColor: theme.competitorColumnBorder,
          }}
        >
          <p
            className='mb-2 text-[11px] font-semibold tracking-wide uppercase'
            style={{ color: theme.competitorSubtitle }}
          >
            {t('home.comparison.competitor')}
          </p>
          <ComparisonCell
            tone='competitor'
            icon={Icon}
            title={t(`home.comparison.${props.rowKey}.competitorTitle`)}
            description={t(
              `home.comparison.${props.rowKey}.competitorDescription`
            )}
            className='px-0 py-0'
          />
        </div>
      </div>
    </div>
  )
}
