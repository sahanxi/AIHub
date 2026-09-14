import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift, Shield, Sparkles, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { PROMO_BENEFIT_KEYS, type PromoBenefitKey } from './comparison-config'
import { comparisonTheme as theme } from './comparison-theme'
import { GiftBoxIllustration } from './gift-box-illustration'

const PROMO_BENEFIT_ICONS: Record<PromoBenefitKey, typeof Sparkles> = {
  quality: Sparkles,
  discount: Zap,
  stable: Shield,
  easy: Gift,
}

interface PromoOfferCardProps {
  isAuthenticated?: boolean
  className?: string
}

function PromoTitle() {
  const { t } = useTranslation()
  const title = t('home.promo.title')
  const nineMatch = title.match(/^(.+?)\s*(9)\s*(.+)$/)
  if (nineMatch) {
    return (
      <h3
        className='text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold tracking-tight'
        style={{ color: theme.promoTitle }}
      >
        {nineMatch[1]}
        <span
          className='mx-1 inline-block'
          style={{
            backgroundImage: theme.promoNineGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {nineMatch[2]}
        </span>
        {nineMatch[3]}
      </h3>
    )
  }

  const percentMatch = title.match(/^(\d+%)(.*)$/)
  if (percentMatch) {
    return (
      <h3
        className='text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold tracking-tight'
        style={{ color: theme.promoTitle }}
      >
        <span
          style={{
            backgroundImage: theme.promoNineGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {percentMatch[1]}
        </span>
        {percentMatch[2]}
      </h3>
    )
  }

  return (
    <h3
      className='text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold tracking-tight'
      style={{ color: theme.promoTitle }}
    >
      {title}
    </h3>
  )
}

export function PromoOfferCard(props: PromoOfferCardProps) {
  const { t } = useTranslation()

  return (
    <article
      className={cn(
        'relative mt-6 overflow-hidden rounded-[24px] border p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-px md:p-6',
        props.className
      )}
      style={{
        background: theme.promoBackground,
        borderColor: theme.cardBorder,
        boxShadow: theme.cardShadow,
      }}
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full blur-3xl'
        style={{ backgroundColor: 'rgba(91, 155, 255, 0.10)' }}
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute right-24 -bottom-10 h-40 w-40 rounded-full blur-3xl'
        style={{ backgroundColor: 'rgba(163, 196, 255, 0.12)' }}
      />

      <div className='relative grid grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_200px] lg:gap-5'>
        <div className='space-y-3.5'>
          <span
            className='inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide'
            style={{
              background: theme.promoBadgeBg,
              color: theme.promoBadgeText,
            }}
          >
            {t('home.promo.badge')}
          </span>
          <div>
            <PromoTitle />
            <p
              className='mt-2 max-w-md text-sm leading-[1.65] md:text-[15px]'
              style={{ color: theme.promoBody }}
            >
              {t('home.promo.description')}
            </p>
            <p
              className='mt-1.5 max-w-md text-xs leading-relaxed md:text-[13px]'
              style={{ color: theme.promoSecondary }}
            >
              {t('home.promo.secondary')}
            </p>
          </div>
          <Button
            className='h-11 rounded-[15px] bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/30 hover:bg-[#1D4ED8]'
            render={
              props.isAuthenticated ? (
                <Link to='/dashboard' />
              ) : (
                <Link to='/sign-up' />
              )
            }
          >
            {t('home.promo.cta')}
            <ArrowRight className='ml-1.5 size-4' />
          </Button>
        </div>

        <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
          {PROMO_BENEFIT_KEYS.map((benefitKey) => {
            const BenefitIcon = PROMO_BENEFIT_ICONS[benefitKey]
            const colors = theme.benefitColors[benefitKey]
            return (
              <div
                key={benefitKey}
                className='flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-transform duration-200 hover:-translate-y-px'
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.82)',
                  borderColor: theme.cardBorder,
                }}
              >
                <span
                  className='flex size-9 shrink-0 items-center justify-center rounded-full'
                  style={{ backgroundColor: colors.bg }}
                >
                  <BenefitIcon
                    className='size-4 stroke-[1.7]'
                    style={{ color: colors.icon }}
                    aria-hidden='true'
                  />
                </span>
                <div className='min-w-0'>
                  <p
                    className='text-sm leading-snug font-semibold'
                    style={{ color: theme.title }}
                  >
                    {t(`home.promo.benefit.${benefitKey}.title`)}
                  </p>
                  <p
                    className='mt-1 text-xs leading-snug'
                    style={{ color: theme.promoBody }}
                  >
                    {t(`home.promo.benefit.${benefitKey}.description`)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <GiftBoxIllustration
          tagLabel={t('home.promo.giftTag')}
          className='mx-auto h-36 w-full max-w-[200px] lg:mx-0 lg:h-[168px] lg:justify-self-end'
        />
      </div>
    </article>
  )
}
