import { Trans, useTranslation } from 'react-i18next'

import { useSystemConfigStore } from '@/stores/system-config-store'

import type { BusinessQuote } from './types'
import { formatDate, formatMoney, formatPeriod } from './format'
import { formatBusinessSettlement } from './settlement'

interface BillingDisclosureProps {
  quote: BusinessQuote
  productName: string
}

function formatRenewalTime(opens?: number, deadline?: number) {
  if (opens && deadline) {
    return `${formatDate(opens)} – ${formatDate(deadline)}`
  }
  if (deadline) return formatDate(deadline)
  if (opens) return formatDate(opens)
  return null
}

export function BillingDisclosure(props: BillingDisclosureProps) {
  const { t } = useTranslation()
  const { quote, productName } = props
  const serviceFrom = quote.quote_at ?? quote.cycle_start_at
  const leadDays = quote.renewal_lead_days ?? 3
  const usdToCnyRate =
    useSystemConfigStore((s) => s.config.currency.usdExchangeRate) || 1
  const settlement = formatBusinessSettlement(
    quote.total_amount,
    quote.currency,
    usdToCnyRate
  )
  const renewalTime = formatRenewalTime(
    quote.renewal_window_opens_at,
    quote.renewal_payment_deadline_at
  )
  const disclosureKey =
    quote.quote_type === 'MID_CYCLE_PRORATED_ONLY'
      ? 'Business seat first payment proration disclosure'
      : 'Business seat cycle start disclosure'

  return (
    <div className='space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div>
        <p className='text-lg font-semibold text-slate-900'>{productName}</p>
        <p className='text-muted-foreground mt-1 text-sm'>
          {quote.chatgpt_email}
        </p>
      </div>

      <div className='rounded-xl border border-blue-100 bg-blue-50/60 p-4'>
        {settlement.usesExchange ? (
          <div className='flex items-center justify-between gap-4 text-sm'>
            <span className='text-muted-foreground'>{t('Subscription price')}</span>
            <span className='text-lg font-semibold text-slate-900'>
              {formatMoney(quote.total_amount, quote.currency)}
            </span>
          </div>
        ) : null}
        <div
          className={
            settlement.usesExchange
              ? 'mt-3 flex items-end justify-between gap-4 border-t border-blue-100 pt-3'
              : 'flex items-end justify-between gap-4'
          }
        >
          <span className='text-muted-foreground text-sm'>
            {t('Amount')}
          </span>
          <p className='text-3xl font-semibold tracking-tight text-[#1677ff]'>
            {settlement.cnyLabel}
          </p>
        </div>
      </div>

      <dl className='space-y-3 text-sm'>
        <div className='flex items-start justify-between gap-4'>
          <dt className='text-muted-foreground shrink-0'>
            {t('Current billing period')}
          </dt>
          <dd className='text-right text-slate-900'>
            {formatPeriod(serviceFrom, quote.cycle_end_at)}
          </dd>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <dt className='text-muted-foreground shrink-0'>
            {t('Next billing period')}
          </dt>
          <dd className='text-right text-slate-900'>
            {formatPeriod(quote.next_cycle_start_at, quote.next_cycle_end_at)}
          </dd>
        </div>
        <div className='flex items-start justify-between gap-4'>
          <dt className='text-muted-foreground shrink-0'>
            {t('Full period price')}
          </dt>
          <dd className='text-right text-lg font-semibold text-slate-900'>
            {formatMoney(quote.next_cycle_amount, quote.currency)}
          </dd>
        </div>
        {renewalTime ? (
          <div className='flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5'>
            <dt className='shrink-0 font-semibold text-amber-800'>
              {t('Renewal time')}
            </dt>
            <dd className='text-right font-semibold text-amber-900'>
              {renewalTime}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className='text-muted-foreground border-t border-slate-100 pt-4 text-sm leading-relaxed'>
        <Trans
          i18nKey={disclosureKey}
          values={{ count: leadDays }}
          components={{
            renewal: (
              <span className='font-semibold text-amber-700' />
            ),
          }}
        />
      </p>
    </div>
  )
}
