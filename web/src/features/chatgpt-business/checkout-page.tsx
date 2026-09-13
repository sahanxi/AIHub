import { AlertTriangleIcon, ArrowRightIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
          <div className='flex flex-col-reverse gap-3 sm:flex-row sm:items-start'>
            <Button
              variant='outline'
              className='h-12 px-8 text-base sm:mt-0'
              onClick={handleBack}
              disabled={checkoutLoading}
            >
              {t('Back')}
            </Button>
            <div className='flex flex-1 flex-col gap-3'>
              <Button
                className='h-12 w-full rounded-xl bg-[#1677ff] text-base font-semibold shadow-md shadow-blue-200/60 hover:bg-[#096dd9]'
                onClick={() => void handlePay()}
                disabled={checkoutLoading}
              >
                {t('Alipay Payment')}
                <ArrowRightIcon className='size-5' />
              </Button>
              <Alert
                className='border-amber-500/50 bg-amber-50 px-3 py-2.5 text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100'
              >
                <AlertTriangleIcon className='text-amber-600! dark:text-amber-400!' />
                <AlertDescription className='text-sm font-medium text-current'>
                  {t(
                    'Before paying, disconnect VPN and international internet access, or payment may fail.'
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
