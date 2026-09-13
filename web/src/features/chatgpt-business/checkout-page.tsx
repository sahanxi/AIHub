import { ArrowRightIcon } from 'lucide-react'
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
import { startBusinessAlipayPayment } from './start-payment'

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
      await startBusinessAlipayPayment(orderRes.data.id, t)
    } catch {
      toast.error(t('Unable to start payment'))
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
        <div className='mx-auto max-w-2xl space-y-6'>
          <BillingDisclosure
            quote={session.quote}
            productName={session.productName}
          />
          <div className='flex flex-col-reverse gap-3 sm:flex-row'>
            <Button
              variant='outline'
              className='h-12 px-8 text-base'
              onClick={handleBack}
              disabled={checkoutLoading}
            >
              {t('Back')}
            </Button>
            <Button
              className='h-12 flex-1 rounded-xl bg-[#1677ff] text-base font-semibold shadow-md shadow-blue-200/60 hover:bg-[#096dd9]'
              onClick={() => void handlePay()}
              disabled={checkoutLoading}
            >
              {t('Alipay Payment')}
              <ArrowRightIcon className='size-5' />
            </Button>
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
