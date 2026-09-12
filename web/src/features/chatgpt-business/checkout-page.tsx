import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'

import { BillingDisclosure } from './billing-disclosure'
import {
  clearBusinessCheckoutSession,
  loadBusinessCheckoutSession,
  type BusinessCheckoutSession,
} from './checkout-session'
import { createBusinessOrder, isApiSuccess } from './api'

export function ChatGPTBusinessCheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [session, setSession] = useState<BusinessCheckoutSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    const stored = loadBusinessCheckoutSession()
    setSession(stored)
    setLoading(false)
  }, [])

  const handleBack = () => {
    void navigate({ to: '/chatgpt-business' })
  }

  const handlePay = async () => {
    if (!session) return
    setCheckoutLoading(true)
    try {
      const orderRes = await createBusinessOrder({
        quote_id: session.quote.id,
        subscription_id: session.subscriptionId ?? undefined,
      })
      if (!isApiSuccess(orderRes)) {
        toast.error(orderRes.message || t('Unable to create order'))
        return
      }
      clearBusinessCheckoutSession()
      await navigate({
        to: '/chatgpt-business/payment',
        search: { order_id: orderRes.data.id },
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  if (!session) {
    return (
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Billing details')}</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='mx-auto max-w-2xl space-y-4 rounded-xl border p-6'>
            <p className='text-muted-foreground text-sm'>
              {t('Checkout session expired')}
            </p>
            <Button onClick={handleBack}>{t('Back')}</Button>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Billing details')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto max-w-2xl space-y-4'>
          <BillingDisclosure
            quote={session.quote}
            productName={session.productName}
            workspace={session.workspace}
          />
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={handleBack}
              disabled={checkoutLoading}
            >
              {t('Back')}
            </Button>
            <Button onClick={() => void handlePay()} disabled={checkoutLoading}>
              {t('Alipay Payment')}
            </Button>
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
