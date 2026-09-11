import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startGatewayCheckout } from '@/features/wallet/lib/payment'

import {
  createBusinessOrder,
  createBusinessQuote,
  deleteBusinessPendingOrder,
  getBusinessCatalog,
  getBusinessPendingOrders,
  getBusinessSelf,
  isApiSuccess,
  payBusinessOrderAlipay,
} from './api'
import type {
  BusinessCatalog,
  BusinessQuote,
  BusinessSeatOrder,
  BusinessSubscription,
  BusinessWorkspace,
} from './types'

function formatMoney(amount: string, currency: string) {
  if (currency === 'CNY') return `¥${amount}`
  if (currency === 'USD') return `$${amount}`
  return `${currency} ${amount}`
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPeriod(start: number, end: number) {
  return `${formatDate(start)} – ${formatDate(end)}`
}

function maskEmail(email: string) {
  const at = email.indexOf('@')
  if (at <= 1) return email
  return `${email.slice(0, 1)}***${email.slice(at)}`
}

function BillingDisclosure(props: {
  quote: BusinessQuote
  productName: string
}) {
  const { t } = useTranslation()
  const { quote, productName } = props
  const serviceFrom = quote.quote_at ?? quote.cycle_start_at
  const leadDays = quote.renewal_lead_days ?? 3

  return (
    <div className='bg-card space-y-5 rounded-xl border p-5'>
      <div>
        <p className='text-lg font-semibold'>{t('Billing details')}</p>
        <p className='text-muted-foreground text-sm'>{productName}</p>
        <p className='text-muted-foreground text-sm'>
          {maskEmail(quote.chatgpt_email)}
        </p>
      </div>

      <div>
        <p className='text-muted-foreground text-xs tracking-wide uppercase'>
          {t('Amount due today')}
        </p>
        <p className='text-3xl font-semibold tracking-tight'>
          {formatMoney(quote.total_amount, quote.currency)}
        </p>
      </div>

      <div className='grid gap-3 text-sm'>
        <div className='flex justify-between gap-4'>
          <span className='text-muted-foreground'>{t('Current period')}</span>
          <span>{formatPeriod(serviceFrom, quote.cycle_end_at)}</span>
        </div>
        <div className='flex justify-between gap-4'>
          <span className='text-muted-foreground'>
            {t('Next billing period')}
          </span>
          <span>
            {formatPeriod(quote.next_cycle_start_at, quote.next_cycle_end_at)}
          </span>
        </div>
        <div className='flex justify-between gap-4'>
          <span className='text-muted-foreground'>
            {t('Full period price')}
          </span>
          <span>{formatMoney(quote.next_cycle_amount, quote.currency)}</span>
        </div>
        {quote.renewal_window_opens_at ? (
          <div className='flex justify-between gap-4'>
            <span className='text-muted-foreground'>
              {t('Renewal available from')}
            </span>
            <span>{formatDate(quote.renewal_window_opens_at)}</span>
          </div>
        ) : null}
        {quote.renewal_payment_deadline_at ? (
          <div className='flex justify-between gap-4'>
            <span className='text-muted-foreground'>{t('Payment due by')}</span>
            <span>{formatDate(quote.renewal_payment_deadline_at)}</span>
          </div>
        ) : null}
      </div>

      <p className='text-muted-foreground text-sm leading-relaxed'>
        {quote.quote_type === 'MID_CYCLE_PRORATED_ONLY'
          ? t('Business seat first payment proration disclosure', {
              count: leadDays,
            })
          : t('Business seat cycle start disclosure', { count: leadDays })}
      </p>
    </div>
  )
}

function PendingOrdersList(props: {
  orders: BusinessSeatOrder[]
  loading: boolean
  onPay: (orderId: number) => void
  onDelete: (order: BusinessSeatOrder) => void
}) {
  const { t } = useTranslation()
  if (props.orders.length === 0) {
    return null
  }

  return (
    <div className='bg-muted/20 space-y-3 rounded-xl border p-4'>
      <p className='text-sm font-medium'>{t('Pending orders')}</p>
      <div className='space-y-2'>
        {props.orders.map((order) => (
          <div
            key={order.id}
            className='bg-background flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'
          >
            <div className='space-y-1 text-sm'>
              <p className='font-medium'>
                {formatMoney(order.total_amount, order.currency)}
              </p>
              <p className='text-muted-foreground'>
                {maskEmail(order.chatgpt_email ?? '')}
              </p>
              {order.created_at || order.cycle_start_at ? (
                <p className='text-muted-foreground text-xs'>
                  {t('Created At')}:{' '}
                  {formatDate(order.created_at ?? order.cycle_start_at ?? 0)}
                </p>
              ) : null}
            </div>
            <div className='flex gap-2'>
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

export function ChatGPTBusinessPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<BusinessCatalog | null>(null)
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(
    null
  )
  const [workspace, setWorkspace] = useState<BusinessWorkspace | null>(null)
  const [email, setEmail] = useState('')
  const [quote, setQuote] = useState<BusinessQuote | null>(null)
  const [pendingOrders, setPendingOrders] = useState<BusinessSeatOrder[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<BusinessSeatOrder | null>(
    null
  )
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadPendingOrders = useCallback(async () => {
    const res = await getBusinessPendingOrders()
    if (isApiSuccess(res)) {
      setPendingOrders(res.data)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catalogRes, selfRes] = await Promise.all([
        getBusinessCatalog(),
        getBusinessSelf(),
      ])
      if (isApiSuccess(catalogRes)) {
        setCatalog(catalogRes.data)
      }
      if (isApiSuccess(selfRes)) {
        setSubscription(selfRes.data.subscription)
        setWorkspace(selfRes.data.workspace)
        if (!selfRes.data.subscription) {
          await loadPendingOrders()
        } else {
          setPendingOrders([])
        }
      }
    } finally {
      setLoading(false)
    }
  }, [loadPendingOrders])

  useEffect(() => {
    void load()
  }, [load])

  const startPayment = async (orderId: number) => {
    const payRes = await payBusinessOrderAlipay({ order_id: orderId })
    if (!isApiSuccess(payRes) || !payRes.data.url) {
      const message =
        payRes.message === 'Order not payable'
          ? t('Order not payable')
          : payRes.message || t('Unable to start payment')
      toast.error(message)
      return false
    }
    toast.success(t('Redirecting to payment page...'))
    return startGatewayCheckout(
      payRes.data.url,
      payRes.data as Record<string, unknown>
    )
  }

  const handlePay = async (existingOrderId?: number) => {
    setCheckoutLoading(true)
    try {
      let orderId = existingOrderId
      if (!orderId) {
        if (!quote) {
          return
        }
        const orderRes = await createBusinessOrder({
          quote_id: quote.id,
          subscription_id: subscription?.id,
        })
        if (!isApiSuccess(orderRes)) {
          toast.error(orderRes.message || t('Unable to create order'))
          return
        }
        orderId = orderRes.data.id
      }
      await startPayment(orderId)
    } catch {
      toast.error(t('Unable to start payment'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleGetQuote = async () => {
    if (!email.trim()) {
      toast.error(t('ChatGPT login email is required'))
      return
    }
    setCheckoutLoading(true)
    try {
      const res = await createBusinessQuote({ chatgpt_email: email.trim() })
      if (!isApiSuccess(res)) {
        toast.error(res.message || t('Unable to create quote'))
        return
      }
      setQuote(res.data)
      await loadPendingOrders()
    } catch {
      toast.error(t('Unable to create quote'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleRenewQuote = async () => {
    if (!subscription) {
      return
    }
    setCheckoutLoading(true)
    try {
      const res = await createBusinessQuote({
        chatgpt_email: subscription.chatgpt_email,
        order_type: 'RENEWAL',
      })
      if (!isApiSuccess(res)) {
        toast.error(res.message || t('Unable to create quote'))
        return
      }
      setQuote(res.data)
    } catch {
      toast.error(t('Unable to create quote'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) {
      return
    }
    setDeleteLoading(true)
    try {
      const res = await deleteBusinessPendingOrder(orderToDelete.id)
      if (!isApiSuccess(res)) {
        toast.error(res.message || t('Unable to delete order'))
        return
      }
      setPendingOrders((orders) =>
        orders.filter((order) => order.id !== orderToDelete.id)
      )
      setOrderToDelete(null)
      toast.success(t('Order deleted'))
    } catch {
      toast.error(t('Unable to delete order'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const visiblePendingOrders = useMemo(() => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      return pendingOrders
    }
    return pendingOrders.filter(
      (order) => order.chatgpt_email?.trim().toLowerCase() === normalizedEmail
    )
  }, [email, pendingOrders])

  if (loading) {
    return <LoadingState />
  }

  const displayWorkspace = workspace ?? catalog?.workspace ?? null
  const subscriptionDescription =
    displayWorkspace?.subscription_description?.trim() ?? ''
  const price = catalog?.price
  const priceLabel =
    price && catalog?.currently_available
      ? `${formatMoney(price.price_amount, price.currency)} ${price.display_unit || ''}`.trim()
      : t('Currently unavailable')

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('ChatGPT Business')}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {t('Business Standard seat for your ChatGPT account')}
          </p>
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
          {subscription ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {catalog?.product?.name || t('Business Standard')}
                </CardTitle>
                {subscriptionDescription ? (
                  <p className='text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap'>
                    {subscriptionDescription}
                  </p>
                ) : null}
                <CardDescription>{subscription.status}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div>
                  <span className='text-muted-foreground'>
                    {t('ChatGPT Account')}:{' '}
                  </span>
                  {subscription.chatgpt_email}
                </div>
                <div>
                  <span className='text-muted-foreground'>
                    {t('Paid through')}:{' '}
                  </span>
                  {formatDate(subscription.prepaid_through)}
                </div>
                {(subscription.status === 'ACTIVE' ||
                  subscription.status === 'EXPIRING') && (
                  <Button
                    onClick={() => void handleRenewQuote()}
                    disabled={checkoutLoading}
                  >
                    {t('Complete renewal')}
                  </Button>
                )}
                {quote && subscription.status !== 'PENDING_CAPACITY' ? (
                  <BillingDisclosure
                    quote={quote}
                    productName={
                      catalog?.product?.name || t('Business Standard')
                    }
                  />
                ) : null}
                {quote ? (
                  <Button
                    onClick={() => void handlePay()}
                    disabled={checkoutLoading}
                  >
                    {t('Continue to Alipay')}
                  </Button>
                ) : null}
                {subscription.status === 'PENDING_CAPACITY' ||
                subscription.status === 'PENDING_ACTIVATION' ? (
                  <p className='text-muted-foreground'>
                    {t('Payment successful. Activation pending.')}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {catalog?.product?.name || t('Business Standard')}
                </CardTitle>
                {subscriptionDescription ? (
                  <p className='text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap'>
                    {subscriptionDescription}
                  </p>
                ) : null}
                <CardDescription>{priceLabel}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {!catalog?.currently_available ? (
                  <p className='text-muted-foreground'>
                    {catalog?.pricing_required
                      ? t('Pricing configuration required')
                      : t('Currently unavailable')}
                  </p>
                ) : (
                  <>
                    <p className='text-muted-foreground text-sm'>
                      {t('Business seat first payment may be prorated')}
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      {t('AIHub will never ask for your ChatGPT password.')}
                    </p>
                    {!quote ? (
                      <>
                        <div className='space-y-2'>
                          <Label htmlFor='chatgpt-email'>
                            {t('ChatGPT Login Email')}
                          </Label>
                          <Input
                            id='chatgpt-email'
                            type='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='you@example.com'
                          />
                        </div>
                        <PendingOrdersList
                          orders={visiblePendingOrders}
                          loading={checkoutLoading || deleteLoading}
                          onPay={(orderId) => void handlePay(orderId)}
                          onDelete={setOrderToDelete}
                        />
                        <Button
                          onClick={() => void handleGetQuote()}
                          disabled={checkoutLoading}
                        >
                          {t('Next')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <BillingDisclosure
                          quote={quote}
                          productName={
                            catalog?.product?.name || t('Business Standard')
                          }
                        />
                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            onClick={() => setQuote(null)}
                            disabled={checkoutLoading}
                          >
                            {t('Back')}
                          </Button>
                          <Button
                            onClick={() => void handlePay()}
                            disabled={checkoutLoading}
                          >
                            {t('Continue to Alipay')}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <ConfirmDialog
          open={orderToDelete !== null}
          onOpenChange={(open) => {
            if (!open && !deleteLoading) {
              setOrderToDelete(null)
            }
          }}
          title={t('Delete pending order?')}
          desc={t(
            'This pending order will be cancelled and can no longer be paid.'
          )}
          confirmText={t('Delete')}
          destructive
          isLoading={deleteLoading}
          handleConfirm={() => void handleDeleteOrder()}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
