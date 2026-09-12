import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  MailIcon,
  RefreshCwIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLobeIcon } from '@/lib/lobe-icon'

import {
  createBusinessOrder,
  createBusinessQuote,
  cancelBusinessSubscription,
  deleteBusinessPendingOrder,
  getBusinessCatalog,
  getBusinessPendingOrders,
  getBusinessSelf,
  isApiSuccess,
} from './api'
import { BusinessSubscriptionStatusBadge } from './status-display'
import type {
  BusinessCatalog,
  BusinessQuote,
  BusinessSeatOrder,
  BusinessSelfSubscription,
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
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<BusinessCatalog | null>(null)
  const [subscriptions, setSubscriptions] = useState<
    BusinessSelfSubscription[]
  >([])
  const [email, setEmail] = useState('')
  const [quote, setQuote] = useState<BusinessQuote | null>(null)
  const [quoteWorkspaceId, setQuoteWorkspaceId] = useState<number | null>(null)
  const [quoteSubscriptionId, setQuoteSubscriptionId] = useState<number | null>(
    null
  )
  const [pendingOrders, setPendingOrders] = useState<BusinessSeatOrder[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<BusinessSeatOrder | null>(
    null
  )
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null
  )
  const selectedSubscription = subscriptions.find(
    (item) => item.workspace?.id === selectedWorkspaceId
  )
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
      const currentSubscriptions = isApiSuccess(selfRes)
        ? (selfRes.data.subscriptions ?? [])
        : []
      if (isApiSuccess(catalogRes)) {
        setCatalog(catalogRes.data)
        const rows = catalogRes.data.workspaces ?? []
        const subscribedWorkspaceId = currentSubscriptions[0]?.workspace?.id
        if (subscribedWorkspaceId) {
          setSelectedWorkspaceId(subscribedWorkspaceId)
        } else if (rows.length > 0) {
          const preferred =
            rows.find((row) => row.currently_available) ?? rows[0]
          setSelectedWorkspaceId(preferred.workspace.id)
        } else if (catalogRes.data.workspace) {
          setSelectedWorkspaceId(catalogRes.data.workspace.id)
        }
      }
      if (isApiSuccess(selfRes)) {
        setSubscriptions(currentSubscriptions)
        await loadPendingOrders()
      }
    } finally {
      setLoading(false)
    }
  }, [loadPendingOrders])

  useEffect(() => {
    void load()
  }, [load])

  const handlePay = async (existingOrderId?: number) => {
    setCheckoutLoading(true)
    try {
      let orderId = existingOrderId
      if (!orderId) {
        if (!quote) return
        const orderRes = await createBusinessOrder({
          quote_id: quote.id,
          subscription_id: quoteSubscriptionId ?? undefined,
        })
        if (!isApiSuccess(orderRes)) {
          toast.error(orderRes.message || t('Unable to create order'))
          return
        }
        orderId = orderRes.data.id
      }
      await navigate({
        to: '/chatgpt-business/payment',
        search: { order_id: orderId },
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleGetQuote = async (workspaceId: number) => {
    if (!email.trim()) {
      toast.error(t('ChatGPT login email is required'))
      return
    }
    setCheckoutLoading(true)
    try {
      const res = await createBusinessQuote({
        chatgpt_email: email.trim(),
        workspace_id: workspaceId,
      })
      if (!isApiSuccess(res)) {
        toast.error(res.message || t('Unable to create quote'))
        return
      }
      setQuote(res.data)
      setQuoteWorkspaceId(workspaceId)
      setQuoteSubscriptionId(null)
      await loadPendingOrders()
    } catch {
      toast.error(t('Unable to create quote'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleRenewQuote = async (subscription: BusinessSelfSubscription) => {
    setCheckoutLoading(true)
    try {
      const res = await createBusinessQuote({
        chatgpt_email: subscription.subscription.chatgpt_email,
        order_type: 'RENEWAL',
        workspace_id: subscription.subscription.workspace_id,
      })
      if (!isApiSuccess(res)) {
        toast.error(res.message || t('Unable to create quote'))
        return
      }
      setQuote(res.data)
      setQuoteWorkspaceId(subscription.subscription.workspace_id)
      setQuoteSubscriptionId(subscription.subscription.id)
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

  const handleCancelSubscription = async (
    subscription: BusinessSelfSubscription
  ) => {
    setCancelLoading(true)
    try {
      const res = await cancelBusinessSubscription(subscription.subscription.id)
      if (!isApiSuccess(res)) throw new Error(res.message)
      toast.success(t('Subscription cancellation scheduled'))
      setCancelConfirmOpen(false)
      const selfRes = await getBusinessSelf()
      if (isApiSuccess(selfRes)) {
        setSubscriptions(selfRes.data.subscriptions ?? [])
      }
    } catch {
      toast.error(t('Unable to cancel subscription'))
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  const catalogWorkspaces = catalog?.workspaces ?? []
  let workspaceRows = catalogWorkspaces
  if (workspaceRows.length === 0 && catalog?.workspace) {
    workspaceRows = [
      {
        workspace: catalog.workspace,
        price: catalog.price,
        pricing_required: catalog.pricing_required,
        currently_available: catalog.currently_available,
      },
    ]
  }
  const cardThemes = [
    {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-100/60',
      status: 'bg-emerald-100 text-emerald-700',
      primary:
        'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/70 hover:from-emerald-600 hover:to-teal-600',
      accent: 'border-emerald-200 bg-white/85',
    },
    {
      card: 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-100/60',
      status: 'bg-blue-100 text-blue-700',
      primary:
        'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-md shadow-blue-200/70 hover:from-blue-600 hover:to-sky-600',
      accent: 'border-blue-200 bg-white/85',
    },
    {
      card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-100/55',
      status: 'bg-violet-100 text-violet-700',
      primary:
        'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-200/70 hover:from-violet-600 hover:to-fuchsia-600',
      accent: 'border-violet-200 bg-white/85',
    },
    {
      card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-100/55',
      status: 'bg-amber-100 text-amber-700',
      primary:
        'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/70 hover:from-amber-600 hover:to-orange-600',
      accent: 'border-amber-200 bg-white/85',
    },
  ]

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('ChatGPT Subscription')}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {t('Manage your ChatGPT subscription and workspace access')}
          </p>
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <PendingOrdersList
          orders={pendingOrders}
          loading={checkoutLoading || deleteLoading}
          onPay={(orderId) => void handlePay(orderId)}
          onDelete={setOrderToDelete}
        />
        <div className='grid w-full auto-rows-fr grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {workspaceRows.map((row, index) => {
            const workspaceSubscription = subscriptions.find(
              (item) => item.workspace?.id === row.workspace.id
            )
            const workspacePrice =
              workspaceSubscription?.price ?? row.price ?? null
            const workspaceAvailable =
              row.currently_available || Boolean(workspaceSubscription)
            const workspaceDescription =
              row.workspace.subscription_description?.trim() ?? ''
            const benefitItems = (
              workspaceDescription || t('subscription.defaultDescription')
            )
              .split(/\n|。|；|;/)
              .map((item) => item.trim())
              .filter(Boolean)
            const workspaceQuote =
              quoteWorkspaceId === row.workspace.id ? quote : null
            const billingLabel = t(
              `subscription.billing.${(row.workspace.billing_cadence || workspacePrice?.billing_cadence || 'monthly').toLowerCase()}`
            )
            const cardTheme = cardThemes[index % cardThemes.length]

            return (
              <Card
                key={row.workspace.id}
                className={`h-[560px] min-h-0 w-full overflow-y-auto rounded-3xl py-0 shadow-lg transition-shadow hover:shadow-xl ${cardTheme.card}`}
              >
                <CardHeader className='!flex !min-h-0 flex-row items-start justify-between gap-4 px-6 pt-6 pb-3'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm [&_svg]:text-slate-950'>
                      {getLobeIcon('OpenAI', 32)}
                    </div>
                    <div className='min-w-0'>
                      <CardTitle className='text-lg font-semibold'>
                        {row.workspace.name}
                      </CardTitle>
                      {workspaceSubscription ? (
                        <div className='mt-1.5'>
                          {workspaceSubscription.subscription.status ===
                          'ACTIVE' ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cardTheme.status}`}
                            >
                              <CheckIcon className='size-3.5' />
                              {t('Subscribed')}
                            </span>
                          ) : (
                            <BusinessSubscriptionStatusBadge
                              status={workspaceSubscription.subscription.status}
                              t={t}
                            />
                          )}
                        </div>
                      ) : (
                        <div className='mt-1.5'>
                          <span
                            className={
                              workspaceAvailable
                                ? `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cardTheme.status}`
                                : 'text-muted-foreground inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold'
                            }
                          >
                            {workspaceAvailable ? (
                              <span className='size-2 rounded-full bg-current' />
                            ) : null}
                            {workspaceAvailable
                              ? t('Available')
                              : t('Currently unavailable')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className='shrink-0 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm'>
                    {billingLabel}
                  </span>
                </CardHeader>
                <CardContent className='flex flex-1 flex-col gap-3 px-6 pb-6 text-sm'>
                  {(() => {
                    if (workspaceSubscription) {
                      return (
                        <>
                          {workspacePrice ? (
                            <div className='border-b border-slate-900/10 pb-3'>
                              <span className='text-4xl font-semibold tracking-tight text-slate-950'>
                                {formatMoney(
                                  workspacePrice.price_amount,
                                  workspacePrice.currency
                                )}
                              </span>
                              <span className='text-muted-foreground ml-2 text-base'>
                                {workspacePrice.display_unit ||
                                  t(
                                    `subscription.billing.${workspacePrice.billing_cadence.toLowerCase()}`
                                  )}
                              </span>
                            </div>
                          ) : null}
                          <div
                            className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 ${cardTheme.accent}`}
                          >
                            <CalendarDaysIcon className='size-4 shrink-0 text-slate-500' />
                            <span className='text-muted-foreground'>
                              {workspaceSubscription.subscription.status ===
                              'CANCELLED'
                                ? t('subscription.validUntil')
                                : t('subscription.nextRenewal')}
                              :{' '}
                            </span>
                            <span className='font-semibold text-slate-800'>
                              {formatDate(
                                workspaceSubscription.subscription
                                  .prepaid_through
                              )}
                            </span>
                          </div>
                          <div className='border-b border-slate-900/10 pb-3'>
                            <p className='mb-2 font-semibold text-slate-900'>
                              {t('subscription.currentBenefits')}
                            </p>
                            <ul className='text-muted-foreground space-y-1.5 leading-snug'>
                              {benefitItems.map((benefit) => (
                                <li key={benefit} className='flex gap-2'>
                                  <CheckIcon className='mt-0.5 size-4 shrink-0 text-emerald-600' />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div
                            className={`rounded-xl border p-3 ${cardTheme.accent}`}
                          >
                            <Label
                              htmlFor={`chatgpt-email-${row.workspace.id}`}
                              className='text-sm font-semibold text-slate-900'
                            >
                              {t('ChatGPT Login Email')}
                            </Label>
                            <div className='relative mt-2'>
                              <MailIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500' />
                              <Input
                                id={`chatgpt-email-${row.workspace.id}`}
                                className='h-11 border-slate-300 bg-white pl-9 text-sm shadow-sm'
                                type='email'
                                value={
                                  workspaceSubscription.subscription
                                    .chatgpt_email
                                }
                                readOnly
                              />
                            </div>
                          </div>
                          {(workspaceSubscription.subscription.status ===
                            'ACTIVE' ||
                            workspaceSubscription.subscription.status ===
                              'EXPIRING') && (
                            <div className='mt-auto flex gap-2 pt-1'>
                              <Button
                                className={`h-11 flex-1 rounded-xl text-base font-semibold shadow-lg ${cardTheme.primary}`}
                                onClick={() => {
                                  setSelectedWorkspaceId(row.workspace.id)
                                  void handleRenewQuote(workspaceSubscription)
                                }}
                                disabled={checkoutLoading}
                              >
                                <RefreshCwIcon className='size-4' />
                                {t('Renew')}
                              </Button>
                              <Button
                                variant='outline'
                                className='h-11 flex-1 rounded-xl border-slate-300 bg-white/80 text-base font-semibold text-slate-700 hover:bg-white'
                                onClick={() => {
                                  setSelectedWorkspaceId(row.workspace.id)
                                  setCancelConfirmOpen(true)
                                }}
                                disabled={cancelLoading}
                              >
                                {t('Cancel subscription')}
                              </Button>
                            </div>
                          )}
                          {workspaceQuote &&
                          workspaceSubscription.subscription.status !==
                            'PENDING_CAPACITY' ? (
                            <BillingDisclosure
                              quote={workspaceQuote}
                              productName={row.workspace.name}
                            />
                          ) : null}
                          {workspaceQuote ? (
                            <Button
                              onClick={() => void handlePay()}
                              disabled={checkoutLoading}
                            >
                              {t('Alipay Payment')}
                            </Button>
                          ) : null}
                          {workspaceSubscription.subscription.status ===
                            'PENDING_CAPACITY' ||
                          workspaceSubscription.subscription.status ===
                            'PENDING_ACTIVATION' ? (
                            <p className='text-muted-foreground'>
                              {t('Payment successful. Activation pending.')}
                            </p>
                          ) : null}
                        </>
                      )
                    }
                    if (!workspaceAvailable) {
                      return (
                        <>
                          {workspacePrice ? (
                            <div className='border-b border-slate-900/10 pb-3'>
                              <span className='text-4xl font-semibold tracking-tight text-slate-950'>
                                {formatMoney(
                                  workspacePrice.price_amount,
                                  workspacePrice.currency
                                )}
                              </span>
                              <span className='text-muted-foreground ml-2 text-base'>
                                {workspacePrice.display_unit ||
                                  t(
                                    `subscription.billing.${workspacePrice.billing_cadence.toLowerCase()}`
                                  )}
                              </span>
                            </div>
                          ) : null}
                          <p className='text-muted-foreground'>
                            {row.pricing_required
                              ? t('Pricing configuration required')
                              : t('Currently unavailable')}
                          </p>
                        </>
                      )
                    }
                    return (
                      <>
                        {workspacePrice ? (
                          <div className='border-b border-slate-900/10 pb-3'>
                            <span className='text-4xl font-semibold tracking-tight text-slate-950'>
                              {formatMoney(
                                workspacePrice.price_amount,
                                workspacePrice.currency
                              )}
                            </span>
                            <span className='text-muted-foreground ml-2 text-base'>
                              {workspacePrice.display_unit ||
                                t(
                                  `subscription.billing.${workspacePrice.billing_cadence.toLowerCase()}`
                                )}
                            </span>
                          </div>
                        ) : null}
                        <div
                          className={`text-muted-foreground flex min-h-14 items-center gap-2 rounded-xl border px-3 leading-snug ${cardTheme.accent}`}
                        >
                          <CalendarDaysIcon className='size-4 shrink-0 text-slate-500' />
                          {t('Business seat first payment may be prorated')}
                        </div>
                        <div className='border-b border-slate-900/10 pb-3'>
                          <p className='mb-2 font-semibold text-slate-900'>
                            {t('subscription.currentBenefits')}
                          </p>
                          <ul className='text-muted-foreground space-y-1.5 leading-snug'>
                            {benefitItems.map((benefit) => (
                              <li key={benefit} className='flex gap-2'>
                                <CheckIcon className='mt-0.5 size-4 shrink-0 text-emerald-600' />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {!workspaceQuote ? (
                          <>
                            <div
                              className={`rounded-xl border p-3 ${cardTheme.accent}`}
                            >
                              <Label
                                htmlFor={`chatgpt-email-${row.workspace.id}`}
                                className='text-sm font-semibold text-slate-900'
                              >
                                {t('ChatGPT Login Email')}
                              </Label>
                              <div className='relative mt-2'>
                                <MailIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500' />
                                <Input
                                  id={`chatgpt-email-${row.workspace.id}`}
                                  className='h-11 border-slate-300 bg-white pl-9 text-sm shadow-sm focus-visible:border-blue-400 focus-visible:ring-blue-200'
                                  type='email'
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  placeholder='you@example.com'
                                />
                              </div>
                            </div>
                            <Button
                              className={`mt-auto h-11 w-full rounded-xl text-base font-semibold shadow-lg ${cardTheme.primary}`}
                              onClick={() => {
                                setSelectedWorkspaceId(row.workspace.id)
                                void handleGetQuote(row.workspace.id)
                              }}
                              disabled={checkoutLoading}
                            >
                              {t('Next')}
                              <ArrowRightIcon className='size-4' />
                            </Button>
                          </>
                        ) : (
                          <>
                            <BillingDisclosure
                              quote={workspaceQuote}
                              productName={row.workspace.name}
                            />
                            <div className='flex gap-2'>
                              <Button
                                variant='outline'
                                onClick={() => {
                                  setQuote(null)
                                  setQuoteWorkspaceId(null)
                                }}
                                disabled={checkoutLoading}
                              >
                                {t('Back')}
                              </Button>
                              <Button
                                onClick={() => void handlePay()}
                                disabled={checkoutLoading}
                              >
                                {t('Alipay Payment')}
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            )
          })}
        </div>
        <ConfirmDialog
          open={cancelConfirmOpen}
          onOpenChange={(open) => {
            if (!open && !cancelLoading) setCancelConfirmOpen(false)
          }}
          title={t('Cancel subscription?')}
          desc={t(
            'Your subscription will remain active until the end of the current period.'
          )}
          confirmText={t('Cancel subscription')}
          destructive
          isLoading={cancelLoading}
          handleConfirm={() =>
            selectedSubscription &&
            void handleCancelSubscription(selectedSubscription)
          }
        />
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
