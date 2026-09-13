import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { formatDate, formatMoney } from './format'
import type { BusinessSeatOrder } from './types'

interface PendingOrdersDialogProps {
  orders: BusinessSeatOrder[]
  loading: boolean
  onPay: (orderId: number) => void
  onDelete: (order: BusinessSeatOrder) => void
}

export function PendingOrdersDialog(props: PendingOrdersDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant='outline'
        className='shrink-0'
        onClick={() => setOpen(true)}
      >
        {t('Pending orders')}
        {props.orders.length > 0 ? (
          <Badge variant='secondary' className='ml-2'>
            {props.orders.length}
          </Badge>
        ) : null}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{t('Pending orders')}</DialogTitle>
            <DialogDescription>
              {props.orders.length === 0
                ? t('No pending orders')
                : t('Complete or remove your unpaid subscription orders')}
            </DialogDescription>
          </DialogHeader>
          {props.orders.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>
              {t('No pending orders')}
            </p>
          ) : (
            <div className='max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto'>
              {props.orders.map((order) => (
                <div
                  key={order.id}
                  className='flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0 space-y-0.5 text-sm'>
                    <p className='font-medium'>
                      {formatMoney(order.total_amount, order.currency)}
                    </p>
                    {order.created_at || order.cycle_start_at ? (
                      <p className='text-muted-foreground text-xs'>
                        {t('Created At')}:{' '}
                        {formatDate(
                          order.created_at ?? order.cycle_start_at ?? 0
                        )}
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
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
