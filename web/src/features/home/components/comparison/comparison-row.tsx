import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { ComparisonRowKey } from './comparison-config'

interface ComparisonRowProps {
  rowKey: ComparisonRowKey
  icon: LucideIcon
  className?: string
}

function ComparisonCell(props: {
  title: string
  description: string
  tone: 'aihub' | 'competitor'
}) {
  const titleClass =
    props.tone === 'aihub'
      ? 'text-foreground'
      : 'text-foreground/90'
  const descClass =
    props.tone === 'competitor'
      ? 'text-[#9a6b6b]/90'
      : 'text-muted-foreground'

  return (
    <div className='flex min-h-[84px] flex-col justify-center py-5 md:min-h-[92px] md:py-6'>
      <p className={cn('text-base leading-snug font-semibold md:text-[17px]', titleClass)}>
        {props.title}
      </p>
      <p
        className={cn(
          'mt-2 max-w-prose text-[13px] leading-[1.7] md:text-sm md:leading-[1.75]',
          descClass
        )}
      >
        {props.description}
      </p>
    </div>
  )
}

export function ComparisonRow(props: ComparisonRowProps) {
  const { t } = useTranslation()
  const Icon = props.icon
  const label = t(`home.comparison.${props.rowKey}.label`)
  const aihubTitle = t(`home.comparison.${props.rowKey}.aihubTitle`)
  const aihubDescription = t(`home.comparison.${props.rowKey}.aihubDescription`)
  const competitorTitle = t(`home.comparison.${props.rowKey}.competitorTitle`)
  const competitorDescription = t(
    `home.comparison.${props.rowKey}.competitorDescription`
  )

  return (
    <div
      className={cn(
        'border-border/40 border-t first:border-t-0',
        props.className
      )}
    >
      <div className='hidden min-h-[84px] grid-cols-[16%_42%_42%] lg:grid lg:min-h-[92px]'>
        <div className='border-border/30 flex items-center gap-3 border-r px-4 py-5 md:px-5 md:py-6'>
          <Icon
            className='text-primary/55 size-5 shrink-0 stroke-[1.6]'
            aria-hidden='true'
          />
          <span className='text-muted-foreground text-sm leading-snug font-medium'>
            {label}
          </span>
        </div>
        <div className='border-border/30 bg-primary/[0.035] border-r px-5 py-0 md:px-6'>
          <ComparisonCell
            tone='aihub'
            title={aihubTitle}
            description={aihubDescription}
          />
        </div>
        <div className='bg-[#faf8f7] px-5 py-0 md:px-6 dark:bg-muted/20'>
          <ComparisonCell
            tone='competitor'
            title={competitorTitle}
            description={competitorDescription}
          />
        </div>
      </div>

      <div className='space-y-4 px-4 py-6 lg:hidden'>
        <div className='flex items-center gap-3'>
          <Icon
            className='text-primary/55 size-5 shrink-0 stroke-[1.6]'
            aria-hidden='true'
          />
          <h3 className='text-foreground text-base font-semibold'>{label}</h3>
        </div>

        <div className='border-primary/15 bg-primary/[0.04] rounded-2xl border p-4 shadow-[0_8px_30px_-18px_rgba(37,99,235,0.45)]'>
          <p className='text-primary mb-3 text-xs font-semibold tracking-wide uppercase'>
            {t('home.comparison.aihub')}
          </p>
          <ComparisonCell
            tone='aihub'
            title={aihubTitle}
            description={aihubDescription}
          />
        </div>

        <p className='text-muted-foreground/70 text-center text-xs font-medium tracking-[0.2em] uppercase'>
          {t('home.comparison.vs')}
        </p>

        <div className='rounded-2xl border border-[#ead9d9] bg-[#faf8f7] p-4 dark:border-border/40 dark:bg-muted/20'>
          <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'>
            {t('home.comparison.competitor')}
          </p>
          <ComparisonCell
            tone='competitor'
            title={competitorTitle}
            description={competitorDescription}
          />
        </div>
      </div>
    </div>
  )
}
