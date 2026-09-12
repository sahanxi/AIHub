import { createFileRoute } from '@tanstack/react-router'

import { ChatGPTBusinessCheckoutPage } from '@/features/chatgpt-business/checkout-page'

export const Route = createFileRoute(
  '/_authenticated/chatgpt-business/checkout'
)({
  component: ChatGPTBusinessCheckoutPage,
})
