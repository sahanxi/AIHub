import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startGatewayCheckout } from '@/features/wallet/lib/payment'
import { useSystemConfigStore } from '@/stores/system-config-store'

import {
  createBusinessOrder,
  createBusinessQuote,
  cancelBusinessSubscription,
  deleteBusinessPendingOrder,
  getBusinessCatalog,
  getBusinessPendingOrders,
  getBusinessSelf,
  isApiSuccess,
  payBusinessOrderAlipay,
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

function formatSettlementCNY(amount: number): string {
  if (!Number.isFinite(amount)) return '-'
  return `¥${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function settlePreviewCNY(
  amount: string,
  currency: string,
  usdToCnyRate: number
): number {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value)) return Number.NaN
  if (currency === 'CNY') return value
  return value * usdToCnyRate
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
  const [payConfirmOpen, setPayConfirmOpen] = useState(false)
  const [pendingPayOrderId, setPendingPayOrderId] = useState<
    number | undefined
  >()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null
  )
  const selectedSubscription = subscriptions.find(
    (item) => item.workspace?.id === selectedWorkspaceId
  )
  const usdToCnyRate =
    useSystemConfigStore((s) => s.config.currency.usdExchangeRate) || 1

  const payConfirmAmount = useMemo(() => {
    if (pendingPayOrderId) {
      const order = pendingOrders.find((item) => item.id === pendingPayOrderId)
      if (order) {
        return {
          display: formatMoney(order.total_amount, order.currency),
          settle: formatSettlementCNY(
            settlePreviewCNY(order.total_amount, order.currency, usdToCnyRate)
          ),
        }
      }
    }
    if (quote) {
      return {
        display: formatMoney(quote.total_amount, quote.currency),
        settle: formatSettlementCNY(
          settlePreviewCNY(quote.total_amount, quote.currency, usdToCnyRate)
        ),
      }
    }
    return null
  }, [pendingPayOrderId, pendingOrders, quote, usdToCnyRate])

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
    setPendingPayOrderId(existingOrderId)
    setPayConfirmOpen(true)
  }

  const confirmPay = async () => {
    setCheckoutLoading(true)
    try {
      let orderId = pendingPayOrderId
      if (!orderId) {
        if (!quote) {
          return
        }
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
      const paid = await startPayment(orderId)
      if (paid) {
        setPayConfirmOpen(false)
      }
    } catch {
      toast.error(t('Unable to start payment'))
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
        <div className='grid w-full grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3'>
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
              .slice(0, 3)
            const workspaceQuote =
              quoteWorkspaceId === row.workspace.id ? quote : null

            const cardPalette = [
              'border-slate-200 bg-slate-50/80',
              'border-blue-100 bg-blue-50/60',
              'border-violet-100 bg-violet-50/60',
              'border-emerald-100 bg-emerald-50/60',
            ]

            return (
              <Card
                key={row.workspace.id}
                className={`w-full shadow-sm transition-shadow hover:shadow-md ${cardPalette[index % cardPalette.length]}`}
              >
                <CardHeader>
                  <CardTitle>{row.workspace.name}</CardTitle>
                  {workspaceDescription ? (
                    <p className='text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap'>
                      {workspaceDescription}
                    </p>
                  ) : null}
                  {workspaceSubscription ? (
                    <div className='mt-1'>
                      {workspaceSubscription.subscription.status ===
                      'ACTIVE' ? (
                        <span className='text-success text-sm font-medium'>
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
                    <div className='mt-1'>
                      <span
                        className={
                          workspaceAvailable
                            ? 'text-success text-sm font-medium'
                            : 'text-muted-foreground text-sm font-medium'
                        }
                      >
                        {workspaceAvailable
                          ? t('Available')
                          : t('Currently unavailable')}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className='space-y-4 text-sm'>
                  {(() => {
                    if (workspaceSubscription) {
                      return (
                        <>
                          {workspacePrice ? (
                            <div className='border-b pb-4'>
                              <span className='text-3xl font-semibold'>
                                {formatMoney(
                                  workspacePrice.price_amount,
                                  workspacePrice.currency
                                )}
                              </span>
                              <span className='text-muted-foreground ml-2 text-sm'>
                                {workspacePrice.display_unit ||
                                  t(
                                    `subscription.billing.${workspacePrice.billing_cadence.toLowerCase()}`
                                  )}
                              </span>
                            </div>
                          ) : null}
                          <div className='text-muted-foreground'>
                            {t(
                              `subscription.billing.${(row.workspace.billing_cadence || workspacePrice?.billing_cadence || 'monthly').toLowerCase()}`
                            )}
                          </div>
                          <div>
                            <span className='text-muted-foreground'>
                              {workspaceSubscription.subscription.status ===
                              'CANCELLED'
                                ? t('subscription.validUntil')
                                : t('subscription.nextRenewal')}
                              :{' '}
                            </span>
                            {formatDate(
                              workspaceSubscription.subscription.prepaid_through
                            )}
                          </div>
                          <div className='space-y-2 border-t pt-4'>
                            <p className='font-medium'>
                              {t('subscription.currentBenefits')}
                            </p>
                            <ul className='text-muted-foreground space-y-1'>
                              {benefitItems.map((benefit) => (
                                <li key={benefit}>✓ {benefit}</li>
                              ))}
                            </ul>
                          </div>
                          {(workspaceSubscription.subscription.status ===
                            'ACTIVE' ||
                            workspaceSubscription.subscription.status ===
                              'EXPIRING') && (
                            <div className='flex flex-wrap gap-2'>
                              <Button
                                onClick={() => {
                                  setSelectedWorkspaceId(row.workspace.id)
                                  void handleRenewQuote(workspaceSubscription)
                                }}
                                disabled={checkoutLoading}
                              >
                                {t('Complete renewal')}
                              </Button>
                              <Button
                                variant='outline'
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
                              {t('Continue to Alipay')}
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
                            <div className='border-b pb-4'>
                              <span className='text-3xl font-semibold'>
                                {formatMoney(
                                  workspacePrice.price_amount,
                                  workspacePrice.currency
                                )}
                              </span>
                              <span className='text-muted-foreground ml-2 text-sm'>
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
                          <div className='border-b pb-4'>
                            <span className='text-3xl font-semibold'>
                              {formatMoney(
                                workspacePrice.price_amount,
                                workspacePrice.currency
                              )}
                            </span>
                            <span className='text-muted-foreground ml-2 text-sm'>
                              {workspacePrice.display_unit ||
                                t(
                                  `subscription.billing.${workspacePrice.billing_cadence.toLowerCase()}`
                                )}
                            </span>
                          </div>
                        ) : null}
                        <div className='text-muted-foreground'>
                          {t(
                            `subscription.billing.${(row.workspace.billing_cadence || workspacePrice?.billing_cadence || 'monthly').toLowerCase()}`
                          )}
                        </div>
                        <div className='space-y-2 border-t pt-4'>
                          <p className='font-medium'>
                            {t('subscription.currentBenefits')}
                          </p>
                          <ul className='text-muted-foreground space-y-1'>
                            {benefitItems.map((benefit) => (
                              <li key={benefit}>✓ {benefit}</li>
                            ))}
                          </ul>
                        </div>
                        <p className='text-muted-foreground text-sm'>
                          {t('Business seat first payment may be prorated')}
                        </p>
                        {!workspaceQuote ? (
                          <>
                            <div className='space-y-2'>
                              <Label
                                htmlFor={`chatgpt-email-${row.workspace.id}`}
                              >
                                {t('ChatGPT Login Email')}
                              </Label>
                              <Input
                                id={`chatgpt-email-${row.workspace.id}`}
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
                              onClick={() => {
                                setSelectedWorkspaceId(row.workspace.id)
                                void handleGetQuote(row.workspace.id)
                              }}
                              disabled={checkoutLoading}
                            >
                              {t('Next')}
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
                                {t('Continue to Alipay')}
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
          {workspaceRows.length === 0 ? (
            <PendingOrdersList
              orders={visiblePendingOrders}
              loading={checkoutLoading || deleteLoading}
              onPay={(orderId) => void handlePay(orderId)}
              onDelete={setOrderToDelete}
            />
          ) : null}
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
          open={payConfirmOpen}
          onOpenChange={(open) => {
            if (!open && !checkoutLoading) {
              setPayConfirmOpen(false)
              setPendingPayOrderId(undefined)
            }
          }}
          title={t('Confirm Payment')}
          desc={t('Review your payment details')}
          confirmText={t('Continue to Alipay')}
          isLoading={checkoutLoading}
          handleConfirm={() => void confirmPay()}
        >
          {payConfirmAmount ? (
            <div className='space-y-3 text-sm'>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>
                  {t('Amount due today')}
                </span>
                <span className='font-semibold'>
                  {payConfirmAmount.display}
                </span>
              </div>
              <div className='flex items-center justify-between gap-4'>
                <span className='text-muted-foreground'>{t('You Pay')}</span>
                <div className='text-right'>
                  <div className='text-lg font-semibold'>
                    {payConfirmAmount.settle}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {t('Settled in CNY via Alipay')}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </ConfirmDialog>
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
