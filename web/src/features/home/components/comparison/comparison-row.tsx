import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { ComparisonRowKey } from './comparison-config'
import { comparisonTheme as theme } from './comparison-theme'

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
  const titleColor =
    props.tone === 'aihub' ? theme.aihubConclusion : theme.competitorConclusion
  const descColor =
    props.tone === 'aihub' ? theme.aihubDescription : theme.competitorDescription

  return (
    <div className='flex flex-col justify-center py-3 md:py-3.5'>
      <p
        className='text-[15px] leading-[1.45] font-semibold md:text-base'
        style={{ color: titleColor }}
      >
        {props.title}
      </p>
      <p
        className='mt-1 text-[12px] leading-[1.55] md:text-[13px] md:leading-[1.6]'
        style={{ color: descColor }}
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
      className={cn('border-t first:border-t-0', props.className)}
      style={{ borderColor: theme.rowBorder }}
    >
      <div className='hidden grid-cols-[16%_42%_42%] items-stretch lg:grid'>
        <div
          className='flex items-center gap-2.5 border-r px-4 py-3 md:px-5 md:py-3.5'
          style={{
            backgroundColor: theme.labelColumnBg,
            borderColor: theme.labelColumnBorder,
          }}
        >
          <span
            className='flex size-8 shrink-0 items-center justify-center rounded-full'
            style={{ backgroundColor: '#F1F4F8' }}
          >
            <Icon
              className='size-4 stroke-[1.6]'
              style={{ color: theme.labelIcon }}
              aria-hidden='true'
            />
          </span>
          <span
            className='text-[13px] leading-snug font-medium md:text-sm'
            style={{ color: theme.labelText }}
          >
            {label}
          </span>
        </div>

        <div
          className='group/aihub flex items-center border-r px-4 py-0 transition-colors duration-200 md:px-5'
          style={{
            background: theme.aihubColumnBg,
            borderColor: theme.aihubColumnBorder,
          }}
        >
          <div
            className='w-full rounded-xl px-1 transition-colors duration-200 group-hover/aihub:bg-[rgba(255,255,255,0.95)]'
            style={{ backgroundColor: theme.aihubRowBg }}
          >
            <ComparisonCell
              tone='aihub'
              title={aihubTitle}
              description={aihubDescription}
            />
          </div>
        </div>

        <div
          className='group/competitor flex items-center px-4 py-0 transition-colors duration-200 md:px-5'
          style={{ background: theme.competitorColumnBg }}
        >
          <div
            className='w-full rounded-xl px-1 transition-colors duration-200 group-hover/competitor:bg-[rgba(255,255,255,0.88)]'
            style={{ backgroundColor: theme.competitorRowBg }}
          >
            <ComparisonCell
              tone='competitor'
              title={competitorTitle}
              description={competitorDescription}
            />
          </div>
        </div>
      </div>

      <div className='space-y-3 px-4 py-4 lg:hidden'>
        <div className='flex items-center gap-2.5'>
          <span
            className='flex size-8 shrink-0 items-center justify-center rounded-full'
            style={{ backgroundColor: '#F1F4F8' }}
          >
            <Icon
              className='size-4 stroke-[1.6]'
              style={{ color: theme.labelIcon }}
              aria-hidden='true'
            />
          </span>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: theme.title }}
          >
            {label}
          </h3>
        </div>

        <div
          className='rounded-2xl border p-3.5'
          style={{
            background: theme.aihubColumnBg,
            borderColor: theme.aihubColumnBorder,
            boxShadow: '0 12px 40px rgba(47, 125, 246, 0.08)',
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
            title={aihubTitle}
            description={aihubDescription}
          />
        </div>

        <p
          className='text-center text-[11px] font-medium tracking-[0.18em] uppercase'
          style={{ color: theme.promoSecondary }}
        >
          {t('home.comparison.vs')}
        </p>

        <div
          className='rounded-2xl border p-3.5'
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
            title={competitorTitle}
            description={competitorDescription}
          />
        </div>
      </div>
    </div>
  )
}
