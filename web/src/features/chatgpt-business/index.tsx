import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/loading-state'
import { startGatewayCheckout } from '@/features/wallet/lib/payment'

import {
  createBusinessOrder,
  createBusinessQuote,
  getBusinessCatalog,
  getBusinessSelf,
  isApiSuccess,
  payBusinessOrderAlipay,
} from './api'
import type { BusinessCatalog, BusinessQuote, BusinessSubscription } from './types'

function formatMoney(amount: string, currency: string) {
  const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : `${currency} `
  return `${symbol}${amount}`
}

function formatPeriod(start: number, end: number) {
  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} → ${fmt(end)}`
}

export function ChatGPTBusinessPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<BusinessCatalog | null>(null)
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null)
  const [email, setEmail] = useState('')
  const [quote, setQuote] = useState<BusinessQuote | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [catalogRes, selfRes] = await Promise.all([getBusinessCatalog(), getBusinessSelf()])
      if (isApiSuccess(catalogRes)) {
        setCatalog(catalogRes.data)
      }
      if (isApiSuccess(selfRes) && selfRes.data.subscription) {
        setSubscription(selfRes.data.subscription)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
    } catch {
      toast.error(t('Unable to create quote'))
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handlePay = async () => {
    if (!quote) {
      return
    }
    setCheckoutLoading(true)
    try {
      const orderRes = await createBusinessOrder({
        quote_id: quote.id,
        subscription_id: subscription?.id,
      })
      if (!isApiSuccess(orderRes)) {
        toast.error(orderRes.message || t('Unable to create order'))
        return
      }
      const payRes = await payBusinessOrderAlipay({ order_id: orderRes.data.id })
      if (!isApiSuccess(payRes) || !payRes.data.url) {
        toast.error(payRes.message || t('Unable to start payment'))
        return
      }
      startGatewayCheckout(payRes.data.url, undefined)
    } catch {
      toast.error(t('Unable to start payment'))
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
      const res = await createBusinessQuote({ chatgpt_email: subscription.chatgpt_email, order_type: 'RENEWAL' })
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

  if (loading) {
    return <LoadingState />
  }

  const price = catalog?.price
  const priceLabel =
    price && catalog?.currently_available
      ? `${formatMoney(price.price_amount, price.currency)} ${price.display_unit || ''}`.trim()
      : t('Currently unavailable')

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('ChatGPT Business')}</h1>
          <p className="text-sm text-muted-foreground">{t('Business Standard seat for your ChatGPT account')}</p>
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {subscription ? (
          <Card>
            <CardHeader>
              <CardTitle>{catalog?.product?.name || t('Business Standard')}</CardTitle>
              <CardDescription>{subscription.status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t('ChatGPT Account')}: </span>
                {subscription.chatgpt_email}
              </div>
              <div>
                <span className="text-muted-foreground">{t('Paid through')}: </span>
                {new Date(subscription.prepaid_through * 1000).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">{t('Next renewal')}: </span>
                {new Date(subscription.prepaid_through * 1000).toLocaleDateString()}
              </div>
              {(subscription.status === 'ACTIVE' || subscription.status === 'EXPIRING') && (
                <Button onClick={() => void handleRenewQuote()} disabled={checkoutLoading}>
                  {t('Renew')}
                </Button>
              )}
              {subscription.status === 'PENDING_CAPACITY' || subscription.status === 'PENDING_ACTIVATION' ? (
                <p className="text-muted-foreground">{t('Payment successful. Activation pending.')}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{catalog?.product?.name || t('Business Standard')}</CardTitle>
              <CardDescription>{priceLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!catalog?.currently_available ? (
                <p className="text-muted-foreground">
                  {catalog?.pricing_required
                    ? t('Pricing configuration required')
                    : t('Currently unavailable')}
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('AIHub will never ask for your ChatGPT password.')}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="chatgpt-email">{t('ChatGPT Login Email')}</Label>
                    <Input
                      id="chatgpt-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                  {!quote ? (
                    <Button onClick={() => void handleGetQuote()} disabled={checkoutLoading}>
                      {t('Get Business Standard')}
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-4">
                      {quote.quote_type === 'MID_CYCLE_PRORATED_PLUS_NEXT' ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>{t('Current billing period')} ({formatPeriod(quote.quote_at || quote.cycle_start_at, quote.cycle_end_at)})</span>
                            <span>{formatMoney(quote.current_cycle_amount, quote.currency)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>{t('Next billing period')} ({formatPeriod(quote.next_cycle_start_at, quote.next_cycle_end_at)})</span>
                            <span>{formatMoney(quote.next_cycle_amount, quote.currency)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t(
                              'Your first payment includes the remaining part of the current billing cycle and the next full billing cycle so your membership stays aligned with the Workspace billing schedule.',
                            )}
                          </p>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span>{t('Current billing period')} ({formatPeriod(quote.cycle_start_at, quote.cycle_end_at)})</span>
                          <span>{formatMoney(quote.total_amount, quote.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium">
                        <span>{t('Total due today')}</span>
                        <span>{formatMoney(quote.total_amount, quote.currency)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('Your next renewal will be due on {{date}}.', {
                          date: new Date(quote.prepaid_through * 1000).toLocaleDateString(),
                        })}
                      </p>
                      <Button onClick={() => void handlePay()} disabled={checkoutLoading}>
                        {t('Pay with Alipay')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
