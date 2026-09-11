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
        className='text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-bold tracking-tight'
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
        className='text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-bold tracking-tight'
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
      className='text-[clamp(1.5rem,2.6vw,2rem)] leading-tight font-bold tracking-tight'
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
        'relative mt-6 overflow-hidden rounded-[26px] border p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-px md:p-5 lg:p-6',
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
        className='pointer-events-none absolute -top-12 -right-8 h-36 w-36 rounded-full blur-3xl'
        style={{ backgroundColor: 'rgba(91, 155, 255, 0.14)' }}
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute right-20 -bottom-8 h-28 w-28 rounded-full blur-3xl'
        style={{ backgroundColor: 'rgba(163, 196, 255, 0.16)' }}
      />

      <div className='relative grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_190px] lg:gap-5'>
        <div className='space-y-3'>
          <span
            className='inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide'
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
              className='mt-2 max-w-md text-[13px] leading-[1.6] md:text-sm'
              style={{ color: theme.promoBody }}
            >
              {t('home.promo.description')}
            </p>
            <p
              className='mt-1 max-w-md text-[11px] leading-relaxed md:text-xs'
              style={{ color: theme.promoSecondary }}
            >
              {t('home.promo.secondary')}
            </p>
          </div>
          <Button
            className='h-10 rounded-[14px] px-5 text-sm font-medium'
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

        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
          {PROMO_BENEFIT_KEYS.map((benefitKey) => {
            const BenefitIcon = PROMO_BENEFIT_ICONS[benefitKey]
            const colors = theme.benefitColors[benefitKey]
            return (
              <div
                key={benefitKey}
                className='flex min-w-0 items-center justify-center gap-2.5 px-1 py-1.5'
              >
                <span
                  className='flex size-8 shrink-0 items-center justify-center rounded-full'
                  style={{ backgroundColor: colors.bg }}
                >
                  <BenefitIcon
                    className='size-3.5 stroke-[1.7]'
                    style={{ color: colors.icon }}
                    aria-hidden='true'
                  />
                </span>
                <div className='min-w-0 flex-1 text-center sm:text-left'>
                  <p
                    className='truncate text-[13px] leading-none font-semibold'
                    style={{ color: theme.title }}
                  >
                    {t(`home.promo.benefit.${benefitKey}.title`)}
                  </p>
                  <p
                    className='mt-1 truncate text-[11px] leading-none'
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
          className='mx-auto h-28 w-full max-w-[190px] lg:mx-0 lg:h-32 lg:justify-self-end'
        />
      </div>
    </article>
  )
}
