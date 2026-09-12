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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()
  if (props.loading) {
    return (
      <div className='grid gap-3 md:grid-cols-3'>
        {['balance', 'usage', 'requests'].map((key) => (
          <div
            key={key}
            className='min-w-0 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm'
          >
            <Skeleton className='h-3.5 w-full' />
            <Skeleton className='mt-2 h-6 w-full sm:h-7' />
            <Skeleton className='mt-1.5 hidden h-3.5 w-24 md:block' />
          </div>
        ))}
      </div>
    )
  }

  const stats: {
    label: string
    value: string
    description: string
    icon: typeof WalletCards
    tone: IconBadgeTone
  }[] = [
    {
      label: t('Current Balance'),
      value: formatQuota(props.user?.quota ?? 0),
      description: t(
        'Platform balance is prepaid API credit. It is not a bank deposit and cannot be withdrawn as cash.'
      ),
      icon: WalletCards,
      tone: 'success',
    },
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
      tone: 'info',
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
      tone: 'chart-4',
    },
  ]

  const cardStyles = [
    'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100/65',
    'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-100/65',
    'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-100/55',
  ]

  return (
    <div className='grid gap-3 md:grid-cols-3'>
      {stats.map((item, index) => (
        <div
          key={item.label}
          className={`min-w-0 rounded-2xl border p-5 shadow-sm ${cardStyles[index]}`}
        >
          <div className='flex items-center gap-1.5 sm:gap-2.5'>
            <IconBadge tone={item.tone} size='stat'>
              <item.icon />
            </IconBadge>
            <div className='text-muted-foreground truncate text-[11px] font-medium tracking-wider uppercase sm:text-xs'>
              {item.label}
            </div>
          </div>

          <div className='text-foreground mt-3 font-mono text-2xl font-bold tracking-tight break-all tabular-nums'>
            {item.value}
          </div>
          <div className='text-muted-foreground/70 mt-2 hidden text-xs leading-5 md:block'>
            {item.description}
          </div>
        </div>
      ))}
    </div>
  )
}
