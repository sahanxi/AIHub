import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import { comparisonTheme as theme } from './comparison-theme'

interface ComparisonCellProps {
  title: string
  description: string
  tone: 'aihub' | 'competitor'
  icon: LucideIcon
  emphasized?: boolean
  className?: string
}

export function ComparisonCell(props: ComparisonCellProps) {
  const Icon = props.icon
  const emphasized = props.emphasized === true
  const titleColor =
    props.tone === 'aihub' ? theme.aihubConclusion : theme.competitorConclusion
  const descColor =
    props.tone === 'aihub' ? theme.aihubDescription : theme.competitorDescription
  const iconBg =
    props.tone === 'aihub' ? theme.aihubIconBg : theme.competitorIconBg
  const iconColor =
    props.tone === 'aihub' ? theme.aihubIcon : theme.competitorIcon

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        emphasized
          ? 'px-7 py-[18px] md:px-8 md:py-5'
          : 'px-5 py-3 md:px-5 md:py-3.5',
        props.className
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          emphasized ? 'size-10 md:size-11' : 'size-9'
        )}
        style={{ backgroundColor: iconBg }}
      >
        <Icon
          className={cn('stroke-[1.65]', emphasized ? 'size-[18px] md:size-5' : 'size-4')}
          style={{ color: iconColor }}
          aria-hidden='true'
        />
      </span>
      <div className='min-w-0 flex-1 pt-0.5'>
        <p
          className={cn(
            'font-semibold leading-[1.45]',
            emphasized ? 'text-[15px] md:text-base' : 'text-[14px] md:text-[15px]'
          )}
          style={{ color: titleColor }}
        >
          {props.title}
        </p>
        <p
          className={cn(
            'mt-1 leading-[1.55]',
            emphasized ? 'text-[13px] md:text-sm md:leading-[1.6]' : 'text-[12px] md:text-[13px]'
          )}
          style={{ color: descColor }}
        >
          {props.description}
        </p>
      </div>
    </div>
  )
}
