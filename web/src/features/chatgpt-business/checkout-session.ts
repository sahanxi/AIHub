import type { BusinessQuote, BusinessWorkspace } from './types'

const CHECKOUT_SESSION_KEY = 'chatgpt-business-checkout'

export type BusinessCheckoutSession = {
  quote: BusinessQuote
  workspace: BusinessWorkspace
  productName: string
  subscriptionId?: number | null
}

export function saveBusinessCheckoutSession(
  session: BusinessCheckoutSession
): void {
  sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(session))
}

export function loadBusinessCheckoutSession(): BusinessCheckoutSession | null {
  const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BusinessCheckoutSession
  } catch {
    return null
  }
}

export function clearBusinessCheckoutSession(): void {
  sessionStorage.removeItem(CHECKOUT_SESSION_KEY)
}
