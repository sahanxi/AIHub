import { CalendarDaysIcon, Clock3Icon, GlobeIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { BusinessQuote, BusinessWorkspace } from './types'
import { getBillingCadenceLabelKey } from './constants'
import { formatDate, formatMoney, formatPeriod } from './format'

interface BillingDisclosureProps {
  quote: BusinessQuote
  productName: string
  workspace?: BusinessWorkspace | null
}

export function BillingDisclosure(props: BillingDisclosureProps) {
  const { t } = useTranslation()
  const { quote, productName, workspace } = props
  const serviceFrom = quote.quote_at ?? quote.cycle_start_at
  const leadDays = quote.renewal_lead_days ?? 3

  return (
    <div className='bg-card space-y-5 rounded-xl border p-5'>
      <div>
        <p className='text-lg font-semibold'>{t('Billing details')}</p>
        <p className='text-muted-foreground text-sm'>{productName}</p>
      </div>

      <div>
        <p className='text-muted-foreground text-xs tracking-wide uppercase'>
          {t('Amount due today')}
        </p>
        <p className='text-3xl font-semibold tracking-tight'>
          {formatMoney(quote.total_amount, quote.currency)}
        </p>
      </div>

      {workspace ? (
        <div className='grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm'>
          <div className='flex items-start justify-between gap-4'>
            <span className='text-muted-foreground inline-flex items-center gap-2'>
              <GlobeIcon className='size-4 shrink-0' />
              {t('Workspace')}
            </span>
            <span className='text-right font-medium'>{workspace.name}</span>
          </div>
          <div className='flex items-start justify-between gap-4'>
            <span className='text-muted-foreground inline-flex items-center gap-2'>
              <CalendarDaysIcon className='size-4 shrink-0' />
              {t('Billing Anchor')}
            </span>
            <span className='text-right font-medium'>
              {formatDate(workspace.billing_anchor_at)}
            </span>
          </div>
          <div className='flex items-start justify-between gap-4'>
            <span className='text-muted-foreground'>{t('Timezone')}</span>
            <span className='text-right font-medium'>
              {workspace.billing_timezone}
            </span>
          </div>
          <div className='flex items-start justify-between gap-4'>
            <span className='text-muted-foreground'>
              {t('Billing cadence')}
            </span>
            <span className='text-right font-medium'>
              {t(getBillingCadenceLabelKey(workspace.billing_cadence))}
            </span>
          </div>
        </div>
      ) : null}

      <div className='grid gap-3 text-sm'>
        <div className='flex items-start justify-between gap-4'>
          <span className='text-muted-foreground shrink-0'>
            {t('Current period')}
          </span>
          <span className='text-right'>{formatPeriod(serviceFrom, quote.cycle_end_at)}</span>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <span className='text-muted-foreground shrink-0'>
            {t('Next billing period')}
          </span>
          <span className='text-right'>
            {formatPeriod(quote.next_cycle_start_at, quote.next_cycle_end_at)}
          </span>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <span className='text-muted-foreground shrink-0'>
            {t('Full period price')}
          </span>
          <span className='text-right'>
            {formatMoney(quote.next_cycle_amount, quote.currency)}
          </span>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <span className='text-muted-foreground shrink-0'>
            {t('Service effective through')}
          </span>
          <span className='text-right font-medium'>
            {formatDate(quote.prepaid_through)}
          </span>
        </div>
        {quote.renewal_window_opens_at ? (
          <div className='flex items-start justify-between gap-4'>
            <span className='text-muted-foreground shrink-0'>
              {t('Renewal available from')}
            </span>
            <span className='text-right'>
              {formatDate(quote.renewal_window_opens_at)}
            </span>
          </div>
        ) : null}
        {quote.renewal_payment_deadline_at ? (
          <div className='flex items-start justify-between gap-4'>
            <span className='text-muted-foreground shrink-0'>
              {t('Payment due by')}
            </span>
            <span className='text-right'>
              {formatDate(quote.renewal_payment_deadline_at)}
            </span>
          </div>
        ) : null}
        <div className='flex items-start justify-between gap-4'>
          <span className='text-muted-foreground inline-flex shrink-0 items-center gap-2'>
            <Clock3Icon className='size-4' />
            {t('Quote valid until')}
          </span>
          <span className='text-right'>{formatDate(quote.expires_at)}</span>
        </div>
      </div>

      <p className='text-muted-foreground text-sm leading-relaxed'>
        {quote.quote_type === 'MID_CYCLE_PRORATED_ONLY'
          ? t('Business seat first payment proration disclosure', {
              count: leadDays,
            })
          : t('Business seat cycle start disclosure', { count: leadDays })}
      </p>
    </div>
  )
}
