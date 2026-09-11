import { api } from '@/lib/api'

import type {
  ApiResponse,
  BusinessCatalog,
  BusinessPriceVersion,
  BusinessQuote,
  BusinessSeat,
  BusinessSeatOrder,
  BusinessSeatPoolStats,
  BusinessSeatTask,
  BusinessSubscription,
  BusinessWorkspace,
} from './types'

export type { ApiResponse }

export function isApiSuccess<T>(response: ApiResponse<T>): boolean {
  return response.success === true
}

export async function getBusinessCatalog(): Promise<
  ApiResponse<BusinessCatalog>
> {
  const res = await api.get('/api/business-seat/catalog')
  return res.data
}

export async function getBusinessSelf(): Promise<
  ApiResponse<{
    subscription: BusinessSubscription | null
    workspace: BusinessWorkspace | null
  }>
> {
  const res = await api.get('/api/business-seat/self')
  return res.data
}

export async function createBusinessQuote(body: {
  chatgpt_email: string
  order_type?: string
}): Promise<ApiResponse<BusinessQuote>> {
  const res = await api.post('/api/business-seat/quote', body, {
    skipBusinessError: true,
  })
  return res.data
}

export async function getBusinessPendingOrders(): Promise<
  ApiResponse<BusinessSeatOrder[]>
> {
  const res = await api.get('/api/business-seat/orders/pending')
  return res.data
}

export async function deleteBusinessPendingOrder(
  orderId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.delete(`/api/business-seat/orders/${orderId}`, {
    skipBusinessError: true,
  })
  return res.data
}

export async function createBusinessOrder(body: {
  quote_id: number
  subscription_id?: number
}): Promise<ApiResponse<BusinessSeatOrder>> {
  const res = await api.post('/api/business-seat/order', body, {
    skipBusinessError: true,
  })
  return res.data
}

export async function payBusinessOrderAlipay(body: {
  order_id: number
}): Promise<ApiResponse<{ mode: string; url: string }>> {
  const res = await api.post('/api/business-seat/alipay/pay', body, {
    skipBusinessError: true,
  })
  return res.data
}

export async function getAdminBusinessOverview(): Promise<
  ApiResponse<Record<string, unknown>>
> {
  const res = await api.get('/api/business-seat/admin/overview')
  return res.data
}

export async function getAdminBusinessWorkspaces(): Promise<
  ApiResponse<BusinessWorkspace[]>
> {
  const res = await api.get('/api/business-seat/admin/workspaces')
  return res.data
}

export async function updateAdminBusinessWorkspace(
  workspaceId: number,
  body: {
    name?: string
    subscription_description?: string
    billing_anchor_at?: number
    billing_timezone?: string
    cycle_start_grace_minutes?: number
    renewal_lead_days?: number
  }
): Promise<ApiResponse<BusinessWorkspace>> {
  const res = await api.put(
    `/api/business-seat/admin/workspaces/${workspaceId}`,
    body
  )
  return res.data
}

export async function createAdminBusinessWorkspace(body: {
  name: string
  subscription_description?: string
  provider?: string
  billing_cadence: string
  billing_anchor_at: number
  billing_timezone: string
  cycle_start_grace_minutes?: number
  renewal_lead_days?: number
  total_standard_seats: number
}): Promise<ApiResponse<BusinessWorkspace>> {
  const res = await api.post('/api/business-seat/admin/workspaces', body)
  return res.data
}

export async function addAdminBusinessSeats(
  workspaceId: number,
  addCount: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(
    `/api/business-seat/admin/workspaces/${workspaceId}/seats`,
    { add_count: addCount }
  )
  return res.data
}

export async function getAdminBusinessSeats(
  workspaceId?: number
): Promise<
  ApiResponse<{ seats: BusinessSeat[]; stats: BusinessSeatPoolStats }>
> {
  const res = await api.get('/api/business-seat/admin/seats', {
    params: workspaceId ? { workspace_id: workspaceId } : undefined,
  })
  return res.data
}

export async function disableAdminBusinessSeat(
  seatId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(`/api/business-seat/admin/seats/${seatId}/disable`)
  return res.data
}

export async function enableAdminBusinessSeat(
  seatId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(`/api/business-seat/admin/seats/${seatId}/enable`)
  return res.data
}

export async function getAdminBusinessTasks(): Promise<
  ApiResponse<BusinessSeatTask[]>
> {
  const res = await api.get('/api/business-seat/admin/tasks')
  return res.data
}

export async function getAdminBusinessSubscriptions(): Promise<
  ApiResponse<{ items: BusinessSubscription[]; total: number }>
> {
  const res = await api.get('/api/business-seat/admin/subscriptions')
  return res.data
}

export async function getAdminBusinessOrders(): Promise<
  ApiResponse<{ items: BusinessSeatOrder[]; total: number }>
> {
  const res = await api.get('/api/business-seat/admin/orders')
  return res.data
}

export async function getAdminBusinessOrder(orderId: number): Promise<
  ApiResponse<{
    order: BusinessSeatOrder
    items: Array<{
      item_type: string
      amount: string
      period_start: number
      period_end: number
    }>
  }>
> {
  const res = await api.get(`/api/business-seat/admin/orders/${orderId}`)
  return res.data
}

export async function getAdminBusinessPricing(): Promise<
  ApiResponse<{
    versions: BusinessPriceVersion[]
    current: BusinessPriceVersion | null
  }>
> {
  const res = await api.get('/api/business-seat/admin/pricing')
  return res.data
}

export async function createAdminBusinessPrice(body: {
  price_amount: string
  currency: string
  billing_cadence: string
  display_unit: string
}): Promise<ApiResponse<BusinessPriceVersion>> {
  const res = await api.post('/api/business-seat/admin/pricing', body)
  return res.data
}

export async function markAdminBusinessInvited(
  subscriptionId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(
    `/api/business-seat/admin/subscriptions/${subscriptionId}/invited`
  )
  return res.data
}

export async function activateAdminBusinessSubscription(
  subscriptionId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(
    `/api/business-seat/admin/subscriptions/${subscriptionId}/activate`
  )
  return res.data
}

export async function confirmAdminSeatAdded(
  subscriptionId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(
    `/api/business-seat/admin/subscriptions/${subscriptionId}/seat-added`
  )
  return res.data
}

export async function confirmAdminRemoved(
  subscriptionId: number
): Promise<ApiResponse<{ success: boolean }>> {
  const res = await api.post(
    `/api/business-seat/admin/subscriptions/${subscriptionId}/removed`
  )
  return res.data
}
