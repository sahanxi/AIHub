import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LoadingState } from '@/components/loading-state'

import { startBusinessAlipayPayment } from './start-payment'

export function ChatGPTBusinessPaymentPage(props: {
  orderId: number
  onBack: () => void
}) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    void startBusinessAlipayPayment(props.orderId, t).then((success) => {
      if (!success) {
        setFailed(true)
      }
    })
  }, [props.orderId, t])

  useEffect(() => {
    if (failed) {
      props.onBack()
    }
  }, [failed, props.onBack])

  return <LoadingState />
}
