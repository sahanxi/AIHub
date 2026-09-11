import { useQuery } from '@tanstack/react-query'
import { Activity, CreditCard, Flame, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { IconBadge } from '@/components/ui/icon-badge'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useStatus } from '@/hooks/use-status'
import { formatNumber, formatQuota } from '@/lib/format'
import { getStartOfDay } from '@/lib/time'
import { useAuthStore } from '@/stores/auth-store'

export function SummaryCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { loading } = useStatus()
  const todayRange = useMemo(() => {
    const start = getStartOfDay()
    return {
      start_timestamp: Math.floor(start.getTime() / 1000),
      end_timestamp: Math.floor(Date.now() / 1000) + 3600,
    }
  }, [])
  const usageQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'summary-today', todayRange.start_timestamp],
    queryFn: () => getUserQuotaDates({ ...todayRange, default_time: 'hour' }),
    staleTime: 60 * 1000,
  })
  const today = usageQuery.data?.data ?? []
  const todaySpend = today.reduce((sum, item) => sum + (Number(item.quota) || 0), 0)
  const todayRequests = today.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
  const cards = [
    { title: t('Available balance'), value: formatQuota(Number(user?.quota ?? 0)), description: t('Available for API calls'), icon: CreditCard, tone: 'info' as const },
    { title: t('Today spend'), value: formatQuota(todaySpend), description: t('Cumulative spend today'), icon: Flame, tone: 'warning' as const },
    { title: t('Today requests'), value: formatNumber(todayRequests), description: t('API calls today'), icon: Zap, tone: 'chart-3' as const },
    { title: t('Service status'), value: t('Normal'), description: t('Global nodes are operating normally'), icon: Activity, tone: 'success' as const },
  ]

  return (
    <StaggerContainer className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      {cards.map((card) => (
        <StaggerItem key={card.title} className='bg-card min-h-36 rounded-2xl border p-4 shadow-xs sm:p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div className='text-muted-foreground text-sm font-medium'>{card.title}</div>
            <IconBadge tone={card.tone} size='sm'><card.icon /></IconBadge>
          </div>
          <div className='mt-5 text-2xl font-semibold tracking-tight tabular-nums'>
            {loading || usageQuery.isLoading ? '—' : card.value}
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>{card.description}</div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  )
}
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
