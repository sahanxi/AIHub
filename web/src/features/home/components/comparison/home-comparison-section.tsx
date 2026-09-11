import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { COMPARISON_ROWS } from './comparison-config'
import { ComparisonRow } from './comparison-row'
import { comparisonTheme as theme } from './comparison-theme'
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
          <h2
            id='home-comparison-title'
            className='text-[clamp(1.75rem,3.2vw,2.5rem)] leading-tight font-bold tracking-tight'
            style={{ color: theme.title }}
          >
            {t('home.comparison.titlePrefix')}
            <span
              style={{
                backgroundImage: theme.titleBrandGradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('home.comparison.titleBrand')}
            </span>
          </h2>
          <p
            className='mx-auto mt-4 max-w-2xl text-sm leading-[1.75] md:text-[15px]'
            style={{ color: theme.subtitle }}
          >
            {t('home.comparison.subtitle')}
          </p>
        </header>

        <div
          className={cn(
            'overflow-hidden rounded-[28px] border backdrop-blur-sm transition-shadow duration-200'
          )}
          style={{
            background: theme.cardBackground,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardShadow,
          }}
        >
          <div
            className='hidden border-b lg:grid lg:grid-cols-[16%_42%_42%] lg:items-center'
            style={{ borderColor: theme.rowBorder }}
          >
            <div
              className='border-r px-5 py-4 text-sm font-medium'
              style={{
                backgroundColor: theme.labelColumnBg,
                borderColor: theme.labelColumnBorder,
                color: theme.labelText,
              }}
            >
              {t('home.comparison.itemLabel')}
            </div>
            <div
              className='border-r px-6 py-4'
              style={{
                background: theme.aihubColumnBg,
                borderColor: theme.aihubColumnBorder,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
            >
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p
                    className='text-lg font-bold tracking-tight'
                    style={{ color: theme.aihubTitle }}
                  >
                    {t('home.comparison.aihub')}
                  </p>
                  <p
                    className='mt-0.5 text-sm'
                    style={{ color: theme.aihubSubtitle }}
                  >
                    {t('home.comparison.aihubSubtitle')}
                  </p>
                </div>
                <span
                  className='shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white'
                  style={{
                    background: theme.badgeGradient,
                    boxShadow: theme.badgeShadow,
                  }}
                >
                  {t('home.comparison.aihubBadge')}
                </span>
              </div>
            </div>
            <div
              className='px-6 py-4'
              style={{ background: theme.competitorColumnBg }}
            >
              <p
                className='text-lg font-bold tracking-tight'
                style={{ color: theme.competitorTitle }}
              >
                {t('home.comparison.competitor')}
              </p>
              <p
                className='mt-0.5 text-sm'
                style={{ color: theme.competitorSubtitle }}
              >
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

        <p
          className='mt-6 max-w-3xl text-left text-xs leading-relaxed md:text-[13px]'
          style={{ color: theme.promoDeadline }}
        >
          {t('home.promo.deadline')}
        </p>
      </div>
    </section>
  )
}
