import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { formatDate, formatMoney } from './format'
import type { BusinessSeatOrder } from './types'

interface PendingOrdersPanelProps {
  orders: BusinessSeatOrder[]
  loading: boolean
  onPay: (orderId: number) => void
  onDelete: (order: BusinessSeatOrder) => void
}

export function PendingOrdersPanel(props: PendingOrdersPanelProps) {
  const { t } = useTranslation()
  if (props.orders.length === 0) {
    return null
  }

  return (
    <div className='bg-muted/30 w-full max-w-md rounded-xl border p-3 sm:min-w-[280px] sm:max-w-sm'>
      <p className='mb-2 text-sm font-medium'>{t('Pending orders')}</p>
      <div className='space-y-2'>
        {props.orders.map((order) => (
          <div
            key={order.id}
            className='bg-background flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between'
          >
            <div className='min-w-0 space-y-0.5 text-sm'>
              <p className='font-medium'>
                {formatMoney(order.total_amount, order.currency)}
              </p>
              {order.created_at || order.cycle_start_at ? (
                <p className='text-muted-foreground text-xs'>
                  {t('Created At')}:{' '}
                  {formatDate(order.created_at ?? order.cycle_start_at ?? 0)}
                </p>
              ) : null}
            </div>
            <div className='flex shrink-0 gap-2'>
              <Button
                size='sm'
                onClick={() => props.onPay(order.id)}
                disabled={props.loading}
              >
                {t('Complete payment')}
              </Button>
              <Button
                size='sm'
                variant='destructive'
                onClick={() => props.onDelete(order)}
                disabled={props.loading}
              >
                {t('Delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
