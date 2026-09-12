import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { ChatGPTBusinessPaymentPage } from '@/features/chatgpt-business/payment-page'

const searchSchema = z.object({ order_id: z.coerce.number().int().positive() })

export const Route = createFileRoute(
  '/_authenticated/chatgpt-business/payment'
)({
  component: RouteComponent,
  validateSearch: searchSchema,
})

function RouteComponent() {
  const navigate = useNavigate()
  const { order_id } = Route.useSearch()
  return (
    <ChatGPTBusinessPaymentPage
      orderId={order_id}
      onBack={() => void navigate({ to: '/chatgpt-business' })}
    />
  )
}
