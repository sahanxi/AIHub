import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { COMPARISON_ROWS } from './comparison-config'
import { ComparisonRow } from './comparison-row'
import { PromoOfferCard } from './promo-offer-card'

interface HomeComparisonSectionProps {
  isAuthenticated?: boolean
  className?: string
}

export function HomeComparisonSection(props: HomeComparisonSectionProps) {
  const { t } = useTranslation()

  return (
    <section
      className={cn(
        'relative z-10 px-6 py-20 md:py-24 lg:py-28',
        props.className
      )}
      aria-labelledby='home-comparison-title'
    >
      <div className='mx-auto max-w-6xl'>
        <header className='mx-auto mb-10 max-w-3xl text-center md:mb-12'>
          <p className='text-primary/75 mb-4 text-[11px] font-semibold tracking-[0.22em] uppercase'>
            {t('home.comparison.eyebrow')}
          </p>
          <h2
            id='home-comparison-title'
            className='text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-bold tracking-tight'
          >
            {t('home.comparison.titlePrefix')}
            <span className='text-primary'>{t('home.comparison.titleBrand')}</span>
          </h2>
          <p className='text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-[1.8] md:text-[15px]'>
            {t('home.comparison.subtitle')}
          </p>
        </header>

        <div
          className={cn(
            'overflow-hidden rounded-[28px] border border-border/50 bg-background/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur-sm',
            'transition-shadow duration-200 hover:shadow-[0_28px_90px_-38px_rgba(37,99,235,0.18)]'
          )}
        >
          <div className='border-border/40 hidden border-b lg:grid lg:grid-cols-[16%_42%_42%]'>
            <div className='border-border/30 text-muted-foreground border-r px-5 py-5 text-sm font-medium'>
              {t('home.comparison.itemLabel')}
            </div>
            <div className='border-primary/15 bg-primary/[0.05] border-r px-6 py-5 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.04)]'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-foreground text-lg font-bold tracking-tight'>
                    {t('home.comparison.aihub')}
                  </p>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {t('home.comparison.aihubSubtitle')}
                  </p>
                </div>
                <Badge className='bg-primary/10 text-primary border-primary/15 shrink-0 border'>
                  {t('home.comparison.aihubBadge')}
                </Badge>
              </div>
            </div>
            <div className='bg-[#faf8f7] px-6 py-5 dark:bg-muted/20'>
              <p className='text-foreground/90 text-lg font-bold tracking-tight'>
                {t('home.comparison.competitor')}
              </p>
              <p className='text-muted-foreground mt-1 text-sm'>
                {t('home.comparison.competitorSubtitle')}
              </p>
            </div>
          </div>

          <div>
            {COMPARISON_ROWS.map((row) => (
              <ComparisonRow
                key={row.key}
                rowKey={row.key}
                icon={row.icon}
              />
            ))}
          </div>
        </div>

        <PromoOfferCard isAuthenticated={props.isAuthenticated} />

        <p className='text-[#8A94A6] mt-6 max-w-3xl text-left text-xs leading-relaxed md:text-[13px]'>
          {t('home.promo.deadline')}
        </p>
      </div>
    </section>
  )
}
