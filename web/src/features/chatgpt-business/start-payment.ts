import type { TFunction } from 'i18next'
import { toast } from 'sonner'

import { startGatewayCheckout } from '@/features/wallet/lib/payment'

import { isApiSuccess, payBusinessOrderAlipay } from './api'

export async function startBusinessAlipayPayment(
  orderId: number,
  t: TFunction
): Promise<boolean> {
  const payRes = await payBusinessOrderAlipay({ order_id: orderId })
  if (!isApiSuccess(payRes) || !payRes.data.url) {
    const message =
      payRes.message === 'Order not payable'
        ? t('Order not payable')
        : payRes.message || t('Unable to start payment')
    toast.error(message)
    return false
  }
  toast.success(t('Redirecting to Alipay...'))
  await startGatewayCheckout(
    payRes.data.url,
    payRes.data as Record<string, unknown>
  )
  return true
}
