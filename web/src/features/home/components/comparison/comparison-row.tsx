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
  icon: LucideIcon
}) {
  const Icon = props.icon
  const titleColor =
    props.tone === 'aihub' ? theme.aihubConclusion : theme.competitorConclusion
  const descColor =
    props.tone === 'aihub' ? theme.aihubDescription : theme.competitorDescription
  const iconBg =
    props.tone === 'aihub' ? theme.aihubIconBg : theme.competitorIconBg
  const iconColor =
    props.tone === 'aihub' ? theme.aihubIcon : theme.competitorIcon

  return (
    <div className='flex items-center justify-center gap-3 px-2 py-2.5 md:gap-3.5 md:py-3'>
      <span
        className='flex size-9 shrink-0 items-center justify-center rounded-full md:size-10'
        style={{ backgroundColor: iconBg }}
      >
        <Icon
          className='size-4 stroke-[1.65] md:size-[18px]'
          style={{ color: iconColor }}
          aria-hidden='true'
        />
      </span>
      <div className='flex min-w-0 flex-1 flex-col items-center justify-center text-center'>
        <p
          className='text-[14px] leading-[1.4] font-semibold md:text-[15px]'
          style={{ color: titleColor }}
        >
          {props.title}
        </p>
        <p
          className='mt-1 text-[12px] leading-[1.5] md:text-[13px] md:leading-[1.55]'
          style={{ color: descColor }}
        >
          {props.description}
        </p>
      </div>
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
      <div className='hidden grid-cols-[16%_42%_42%] items-center lg:grid'>
        <div
          className='flex h-full items-center justify-center gap-2.5 border-r px-3 py-2.5 md:px-4 md:py-3'
          style={{
            background: theme.labelColumnBg,
            borderColor: theme.labelColumnBorder,
          }}
        >
          <span
            className='flex size-8 shrink-0 items-center justify-center rounded-full'
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
          >
            <Icon
              className='size-4 stroke-[1.6]'
              style={{ color: theme.labelIcon }}
              aria-hidden='true'
            />
          </span>
          <span
            className='text-center text-[13px] leading-snug font-medium md:text-sm'
            style={{ color: theme.labelText }}
          >
            {label}
          </span>
        </div>

        <div
          className='flex h-full items-center justify-center border-r px-2 md:px-3'
          style={{
            background: theme.aihubColumnBg,
            borderColor: theme.aihubColumnBorder,
          }}
        >
          <ComparisonCell
            tone='aihub'
            icon={Icon}
            title={aihubTitle}
            description={aihubDescription}
          />
        </div>

        <div
          className='flex h-full items-center justify-center px-2 md:px-3'
          style={{ background: theme.competitorColumnBg }}
        >
          <ComparisonCell
            tone='competitor'
            icon={Icon}
            title={competitorTitle}
            description={competitorDescription}
          />
        </div>
      </div>

      <div className='space-y-3 px-4 py-3.5 lg:hidden'>
        <div className='flex items-center justify-center gap-2.5'>
          <span
            className='flex size-8 shrink-0 items-center justify-center rounded-full'
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
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
          className='rounded-2xl border p-3'
          style={{
            background: theme.aihubColumnBg,
            borderColor: theme.aihubColumnBorder,
          }}
        >
          <p
            className='mb-2 text-center text-[11px] font-semibold tracking-wide uppercase'
            style={{ color: theme.titleBrand }}
          >
            {t('home.comparison.aihub')}
          </p>
          <ComparisonCell
            tone='aihub'
            icon={Icon}
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
          className='rounded-2xl border p-3'
          style={{
            background: theme.competitorColumnBg,
            borderColor: theme.competitorColumnBorder,
          }}
        >
          <p
            className='mb-2 text-center text-[11px] font-semibold tracking-wide uppercase'
            style={{ color: theme.competitorSubtitle }}
          >
            {t('home.comparison.competitor')}
          </p>
          <ComparisonCell
            tone='competitor'
            icon={Icon}
            title={competitorTitle}
            description={competitorDescription}
          />
        </div>
      </div>
    </div>
  )
}
