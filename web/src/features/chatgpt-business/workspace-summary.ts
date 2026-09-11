import type { TFunction } from 'i18next'

import type { BusinessWorkspace } from './types'
import { getBillingCadenceLabelKey, getProviderLabelKey } from './constants'

export interface WorkspaceSubscriptionSummaryInput {
  provider: string
  billingCadence: string
  billingAnchorAt?: number
  billingTimezone: string
  seatCount: number
  graceMinutes: number
}

export function formatWorkspaceSubscriptionSummary(
  input: WorkspaceSubscriptionSummaryInput,
  t: TFunction,
  formatTimestamp: (timestamp: number) => string,
): string {
  const anchorText = input.billingAnchorAt
    ? formatTimestamp(input.billingAnchorAt)
    : t('Not set')

  return t('Workspace subscription summary', {
    provider: t(getProviderLabelKey(input.provider)),
    cadence: t(getBillingCadenceLabelKey(input.billingCadence)),
    anchor: anchorText,
    timezone: input.billingTimezone,
    seats: input.seatCount,
    grace: input.graceMinutes,
  })
}

export function formatWorkspaceSubscriptionSummaryFromWorkspace(
  workspace: BusinessWorkspace,
  t: TFunction,
  formatTimestamp: (timestamp: number) => string,
): string {
  return formatWorkspaceSubscriptionSummary(
    {
      provider: workspace.provider,
      billingCadence: workspace.billing_cadence,
      billingAnchorAt: workspace.billing_anchor_at,
      billingTimezone: workspace.billing_timezone,
      seatCount: workspace.pool?.total ?? workspace.total_standard_seats,
      graceMinutes: workspace.cycle_start_grace_minutes,
    },
    t,
    formatTimestamp,
  )
}
