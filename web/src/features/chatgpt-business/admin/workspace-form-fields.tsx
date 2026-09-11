import type { TFunction } from 'i18next'

import { DateTimePicker } from '@/components/datetime-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  BUSINESS_BILLING_CADENCES,
  BUSINESS_WORKSPACE_PROVIDERS,
  BUSINESS_WORKSPACE_TIMEZONES,
  getBillingCadenceLabelKey,
  getProviderLabelKey,
  getTimezoneLabelKey,
} from '../constants'
import { formatWorkspaceSubscriptionSummary } from '../workspace-summary'

function FieldHint(props: { children: string }) {
  return <p className="text-xs text-muted-foreground">{props.children}</p>
}

export function WorkspaceNameField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Workspace Name')}</Label>
      <FieldHint>{props.t('Workspace name helper')}</FieldHint>
      <Input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  )
}

export function WorkspaceSubscriptionDescriptionField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Subscription description')}</Label>
      <FieldHint>{props.t('Subscription description helper')}</FieldHint>
      <Textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        rows={4}
        maxLength={2000}
      />
    </div>
  )
}

export function WorkspaceSubscriptionAlignmentPreview(props: {
  t: TFunction
  summaryInput: {
    provider: string
    billingCadence: string
    billingAnchorAt?: number
    billingTimezone: string
    seatCount: number
    graceMinutes: number
  }
  formatTimestamp: (timestamp: number) => string
}) {
  const summary = formatWorkspaceSubscriptionSummary(
    props.summaryInput,
    props.t,
    props.formatTimestamp,
  )

  return (
    <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      {props.t('Subscription alignment preview')}: {summary}
    </p>
  )
}

export function WorkspaceProviderField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Provider')}</Label>
      <FieldHint>{props.t('Provider helper')}</FieldHint>
      <Select value={props.value} onValueChange={(value) => value && props.onChange(value)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {BUSINESS_WORKSPACE_PROVIDERS.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {props.t(getProviderLabelKey(provider))}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export function WorkspaceBillingCadenceField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Billing')}</Label>
      <FieldHint>{props.t('Billing cadence helper')}</FieldHint>
      <Select value={props.value} onValueChange={(value) => value && props.onChange(value)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {BUSINESS_BILLING_CADENCES.map((cadence) => (
              <SelectItem key={cadence} value={cadence}>
                {props.t(getBillingCadenceLabelKey(cadence))}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export function WorkspaceTimezoneField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Timezone')}</Label>
      <FieldHint>{props.t('Timezone helper')}</FieldHint>
      <Select value={props.value} onValueChange={(value) => value && props.onChange(value)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {BUSINESS_WORKSPACE_TIMEZONES.map((timezone) => (
              <SelectItem key={timezone} value={timezone}>
                {props.t(getTimezoneLabelKey(timezone))}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export function WorkspaceBillingAnchorField(props: {
  t: TFunction
  value?: Date
  onChange: (value?: Date) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Billing Anchor')}</Label>
      <FieldHint>{props.t('Billing anchor helper')}</FieldHint>
      <DateTimePicker
        value={props.value}
        onChange={props.onChange}
        className={props.disabled ? 'pointer-events-none opacity-50' : undefined}
      />
    </div>
  )
}

export function WorkspaceSeatCountField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Seat Count')}</Label>
      <FieldHint>{props.t('Seat count helper')}</FieldHint>
      <Input
        inputMode="numeric"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  )
}

export function WorkspaceGraceMinutesField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Grace Minutes')}</Label>
      <FieldHint>{props.t('Grace minutes helper')}</FieldHint>
      <Input
        inputMode="numeric"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  )
}

export function WorkspaceRenewalLeadDaysField(props: {
  t: TFunction
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{props.t('Renewal lead time')}</Label>
      <FieldHint>{props.t('Renewal lead time helper')}</FieldHint>
      <Input
        inputMode="numeric"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <FieldHint>{props.t('Renewal lead time workspace policy helper')}</FieldHint>
    </div>
  )
}
