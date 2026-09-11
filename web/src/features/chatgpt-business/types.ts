export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface BusinessPriceVersion {
  id: number
  product_id: number
  workspace_id?: number
  price_amount: string
  currency: string
  billing_cadence: string
  display_unit: string
  effective_from: number
  effective_to?: number | null
}

export interface BusinessProduct {
  id: number
  code: string
  name: string
  enabled: boolean
}

export interface BusinessWorkspace {
  id: number
  name: string
  subscription_description?: string
  provider: string
  workspace_type: string
  status: string
  billing_cadence: string
  billing_anchor_at: number
  billing_timezone: string
  cycle_start_grace_minutes: number
  renewal_lead_days: number
  total_standard_seats: number
  pool?: BusinessSeatPoolStats
  active_subscriptions?: number
}

export interface BusinessCatalogWorkspace {
  workspace: BusinessWorkspace
  price: BusinessPriceVersion | null
  pricing_required: boolean
  currently_available: boolean
}

export interface BusinessCatalog {
  enabled: boolean
  product: BusinessProduct | null
  price: BusinessPriceVersion | null
  workspace: BusinessWorkspace | null
  workspaces?: BusinessCatalogWorkspace[]
  pricing_required: boolean
  currently_available: boolean
}

export interface BusinessQuote {
  id: number
  quote_at?: number
  quote_type: string
  currency: string
  current_cycle_amount: string
  next_cycle_amount: string
  total_amount: string
  cycle_start_at: number
  cycle_end_at: number
  next_cycle_start_at: number
  next_cycle_end_at: number
  prepaid_through: number
  renewal_window_opens_at?: number
  renewal_payment_deadline_at?: number
  renewal_lead_days?: number
  expires_at: number
  chatgpt_email: string
}

export interface BusinessSeatOrder {
  id: number
  order_no: string
  total_amount: string
  currency: string
  status: string
  prepaid_through: number
  cycle_start_at?: number
  chatgpt_email?: string
  created_at?: number
}

export interface BusinessSubscription {
  id: number
  user_id: number
  status: string
  chatgpt_email: string
  prepaid_through: number
  activated_at?: number | null
  created_at?: number
  workspace_id: number
  seat_id?: number | null
  last_order_id?: number | null
  current_price_version_id?: number
}

export interface BusinessSelfSubscription {
  subscription: BusinessSubscription
  workspace: BusinessWorkspace | null
  price: BusinessPriceVersion | null
}

export interface BusinessSeatPoolStats {
  total: number
  available: number
  reserved: number
  invited: number
  active: number
  pending_release: number
  disabled?: number
}

export interface BusinessSeat {
  id: number
  workspace_id: number
  seat_number: number
  status: string
  subscription_id?: number | null
  user_id?: number | null
  assigned_email: string
  activated_at?: number | null
}

export interface BusinessSeatTask {
  id: number
  task_type: string
  status: string
  workspace_id: number
  subscription_id?: number | null
  seat_id?: number | null
  user_id?: number | null
  payload: string
  created_at: number
  chatgpt_email?: string
  workspace_name?: string
  seat_number?: number
}
