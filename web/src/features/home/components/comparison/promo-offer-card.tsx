import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift, Shield, Sparkles, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { PROMO_BENEFIT_KEYS, type PromoBenefitKey } from './comparison-config'
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

export function PromoOfferCard(props: PromoOfferCardProps) {
  const { t } = useTranslation()

  return (
    <article
      className={cn(
        'relative mt-8 overflow-hidden rounded-[30px] border border-primary/10 bg-gradient-to-br from-[#f5f9ff] via-[#f8fbff] to-[#eef4ff] p-6 shadow-[0_20px_60px_-30px_rgba(37,99,235,0.35)] md:p-8 lg:p-10',
        'transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_24px_70px_-28px_rgba(37,99,235,0.4)]',
        props.className
      )}
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl'
      />
      <div className='relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_220px] lg:gap-6'>
        <div className='space-y-5'>
          <span className='border-primary/15 bg-primary/8 text-primary inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide'>
            {t('home.promo.badge')}
          </span>
          <div>
            <h3 className='text-foreground text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-bold tracking-tight'>
              {t('home.promo.title')}
            </h3>
            <p className='text-muted-foreground mt-3 max-w-md text-sm leading-[1.75] md:text-[15px]'>
              {t('home.promo.description')}
            </p>
            <p className='text-muted-foreground/80 mt-2 max-w-md text-xs leading-relaxed md:text-[13px]'>
              {t('home.promo.secondary')}
            </p>
          </div>
          <Button
            className='h-11 rounded-[15px] px-6 text-sm font-medium'
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

        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4'>
          {PROMO_BENEFIT_KEYS.map((benefitKey) => {
            const BenefitIcon = PROMO_BENEFIT_ICONS[benefitKey]
            return (
              <div
                key={benefitKey}
                className='border-border/40 bg-background/70 rounded-2xl border px-3 py-3 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-px'
              >
                <BenefitIcon
                  className='text-primary/70 mb-2 size-4 stroke-[1.7]'
                  aria-hidden='true'
                />
                <p className='text-foreground text-sm leading-snug font-semibold'>
                  {t(`home.promo.benefit.${benefitKey}.title`)}
                </p>
                <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                  {t(`home.promo.benefit.${benefitKey}.description`)}
                </p>
              </div>
            )
          })}
        </div>

        <GiftBoxIllustration
          tagLabel={t('home.promo.giftTag')}
          className='mx-auto h-40 w-full max-w-[220px] lg:mx-0 lg:h-44 lg:justify-self-end'
        />
      </div>
    </article>
  )
}
