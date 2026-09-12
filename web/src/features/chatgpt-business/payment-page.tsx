import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  WalletCardsIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { startGatewayCheckout } from '@/features/wallet/lib/payment'

import {
  getBusinessPendingOrders,
  isApiSuccess,
  payBusinessOrderAlipay,
} from './api'
import type { BusinessSeatOrder } from './types'

function formatMoney(amount: string, currency: string) {
  if (currency === 'CNY') return `¥${amount}`
  if (currency === 'USD') return `$${amount}`
  return `${currency} ${amount}`
}

export function ChatGPTBusinessPaymentPage(props: {
  orderId: number
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<BusinessSeatOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const order = useMemo(
    () => orders.find((item) => item.id === props.orderId) ?? null,
    [orders, props.orderId]
  )

  useEffect(() => {
    void (async () => {
      const res = await getBusinessPendingOrders()
      if (isApiSuccess(res)) setOrders(res.data)
      setLoading(false)
    })()
  }, [])

  const pay = async () => {
    if (!order) return
    setPaying(true)
    try {
      const res = await payBusinessOrderAlipay({ order_id: order.id })
      if (!isApiSuccess(res) || !res.data.url) {
        toast.error(res.message || t('Unable to start payment'))
        return
      }
      await startGatewayCheckout(
        res.data.url,
        res.data as Record<string, unknown>
      )
    } finally {
      setPaying(false)
    }
  }

  return (
    <main className='min-h-[calc(100vh-7rem)] bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.20),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.18),_transparent_30%)] px-4 py-8 sm:px-6 sm:py-12'>
      <div className='mx-auto w-full max-w-5xl'>
        <Button variant='ghost' className='mb-6 gap-2' onClick={props.onBack}>
          <ArrowLeftIcon className='size-4' />
          {t('Back')}
        </Button>
        <div className='grid overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-blue-200/35 lg:grid-cols-[1.08fr_0.92fr]'>
          <section className='bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white sm:p-10'>
            <div className='flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20'>
              <WalletCardsIcon className='size-7' />
            </div>
            <p className='mt-8 text-sm font-medium tracking-[0.18em] text-blue-200 uppercase'>
              {t('Alipay Payment')}
            </p>
            <h1 className='mt-3 text-3xl font-semibold tracking-tight sm:text-4xl'>
              {t('Complete your subscription')}
            </h1>
            <p className='mt-4 max-w-md text-sm leading-6 text-slate-300'>
              {t(
                'Review your payment details and complete the transaction securely with Alipay.'
              )}
            </p>
            <div className='mt-12 flex items-center gap-3 text-sm text-slate-300'>
              <ShieldCheckIcon className='size-5 text-emerald-300' />
              {t('Settled in CNY via Alipay')}
            </div>
          </section>
          <section className='p-7 sm:p-10'>
            {loading ? (
              <div className='h-72 animate-pulse rounded-2xl bg-slate-100' />
            ) : null}
            {!loading && !order ? (
              <div className='rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900'>
                {t('Order not payable')}
              </div>
            ) : null}
            {!loading && order ? (
              <div>
                <p className='text-sm font-medium text-slate-500'>
                  {t('Amount due today')}
                </p>
                <p className='mt-2 text-5xl font-semibold tracking-tight text-slate-950'>
                  {formatMoney(order.total_amount, order.currency)}
                </p>
                <div className='mt-8 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm'>
                  <div className='flex justify-between gap-4'>
                    <span className='text-slate-500'>{t('Order Number')}</span>
                    <span className='font-medium text-slate-900'>
                      {order.order_no}
                    </span>
                  </div>
                  <div className='flex justify-between gap-4'>
                    <span className='text-slate-500'>
                      {t('Payment Method')}
                    </span>
                    <span className='font-medium text-slate-900'>Alipay</span>
                  </div>
                </div>
                <Button
                  className='mt-8 h-13 w-full rounded-2xl bg-gradient-to-r from-[#1677ff] to-[#4f9cff] text-base font-semibold shadow-xl shadow-blue-300/50 hover:from-[#096dd9] hover:to-[#3d8df5]'
                  onClick={() => void pay()}
                  disabled={paying}
                >
                  {t('Alipay Payment')}
                  <ArrowRightIcon className='size-5' />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}
