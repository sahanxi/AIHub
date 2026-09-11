import type { TFunction } from 'i18next'

import { StatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'

const SUBSCRIPTION_STATUS_VARIANT = {
  ACTIVE: 'success',
  EXPIRING: 'warning',
  INVITED: 'info',
  PENDING_ACTIVATION: 'warning',
  PENDING_CAPACITY: 'warning',
  PENDING_REMOVAL: 'danger',
  PENDING_PAYMENT: 'neutral',
  REMOVED: 'neutral',
  EXPIRED: 'danger',
  CANCELLED: 'neutral',
  REACTIVATION_REQUIRED: 'warning',
} as const

const SEAT_STATUS_VARIANT = {
  ACTIVE: 'success',
  AVAILABLE: 'success',
  INVITED: 'info',
  RESERVED: 'warning',
  PENDING_RELEASE: 'danger',
  DISABLED: 'neutral',
} as const

const TASK_TYPE_VARIANT = {
  INVITE_MEMBER: 'info',
  CONFIRM_ACTIVATION: 'warning',
  ADD_SEAT: 'warning',
  REMOVE_MEMBER: 'danger',
  VERIFY_REACTIVATION: 'info',
} as const

const TASK_STATUS_VARIANT = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  DONE: 'success',
  CANCELLED: 'neutral',
} as const

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

function statusLabel(t: TFunction, prefix: string, status: string) {
  const key = `${prefix}.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}

export function BusinessSubscriptionStatusBadge(props: {
  status: string
  t: TFunction
}) {
  const variant =
    SUBSCRIPTION_STATUS_VARIANT[
      props.status as keyof typeof SUBSCRIPTION_STATUS_VARIANT
    ] ?? 'neutral'
  return (
    <StatusBadge variant={variant as StatusVariant} copyable={false}>
      {statusLabel(props.t, 'Business subscription status', props.status)}
    </StatusBadge>
  )
}

export function BusinessSeatStatusBadge(props: { status: string; t: TFunction }) {
  const variant =
    SEAT_STATUS_VARIANT[props.status as keyof typeof SEAT_STATUS_VARIANT] ??
    'neutral'
  return (
    <StatusBadge variant={variant as StatusVariant} copyable={false}>
      {statusLabel(props.t, 'Business seat status', props.status)}
    </StatusBadge>
  )
}

export function BusinessTaskTypeBadge(props: { taskType: string; t: TFunction }) {
  const variant =
    TASK_TYPE_VARIANT[props.taskType as keyof typeof TASK_TYPE_VARIANT] ??
    'neutral'
  return (
    <StatusBadge variant={variant as StatusVariant} copyable={false}>
      {statusLabel(props.t, 'Business task type', props.taskType)}
    </StatusBadge>
  )
}

export function BusinessTaskStatusBadge(props: { status: string; t: TFunction }) {
  const variant =
    TASK_STATUS_VARIANT[props.status as keyof typeof TASK_STATUS_VARIANT] ??
    'neutral'
  return (
    <StatusBadge variant={variant as StatusVariant} copyable={false}>
      {statusLabel(props.t, 'Business task status', props.status)}
    </StatusBadge>
  )
}

export function ImportantTimestamp(props: {
  ts?: number | null
  format: (ts?: number | null) => string
  emphasis?: 'default' | 'warning' | 'danger'
}) {
  const emphasisClass =
    props.emphasis === 'warning'
      ? 'text-warning font-medium'
      : props.emphasis === 'danger'
        ? 'text-destructive font-medium'
        : 'text-foreground font-medium'
  return <span className={cn('tabular-nums', emphasisClass)}>{props.format(props.ts)}</span>
}
