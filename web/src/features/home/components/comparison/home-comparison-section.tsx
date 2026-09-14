import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { AihubMark } from './aihub-mark'
import { ComparisonCell } from './comparison-cell'
import { COMPARISON_ROWS } from './comparison-config'
import { ComparisonRow } from './comparison-row'
import {
  AIHUB_COLUMN_FLOAT_OFFSET,
  COMPARISON_GRID_COLUMNS,
  comparisonTheme as theme,
} from './comparison-theme'
import { PromoOfferCard } from './promo-offer-card'

interface HomeComparisonSectionProps {
  isAuthenticated?: boolean
  className?: string
}

const ROW_COUNT = COMPARISON_ROWS.length

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
          className='isolate overflow-hidden rounded-[28px] border lg:overflow-visible lg:border-0 lg:bg-transparent lg:shadow-none'
          style={{
            background: theme.cardBackground,
            borderColor: theme.cardBorder,
            boxShadow: theme.cardShadow,
          }}
        >
          <div
            className='relative hidden lg:grid lg:overflow-visible lg:py-6'
            style={{
              gridTemplateColumns: COMPARISON_GRID_COLUMNS,
              gridTemplateRows: `auto repeat(${ROW_COUNT}, minmax(0, auto))`,
            }}
          >
            <div
              className='col-start-1 row-span-full grid grid-rows-subgrid rounded-l-[28px] border border-r-0'
              style={{
                gridRow: `1 / span ${ROW_COUNT + 1}`,
                background: theme.labelColumnBg,
                borderColor: theme.labelColumnBorder,
                boxShadow: theme.cardShadow,
              }}
            >
              <div
                className='flex min-h-[92px] items-center justify-center border-b px-4 py-4 text-center text-sm font-semibold'
                style={{
                  borderColor: theme.rowBorder,
                  color: theme.labelText,
                }}
              >
                {t('home.comparison.itemLabel')}
              </div>
              {COMPARISON_ROWS.map((row) => {
                const Icon = row.icon
                return (
                  <div
                    key={row.key}
                    className='flex items-start gap-3 border-b px-4 py-3.5 last:border-b-0'
                    style={{ borderColor: theme.rowBorder }}
                  >
                    <span
                      className='flex size-9 shrink-0 items-center justify-center rounded-full'
                      style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}
                    >
                      <Icon
                        className='size-4 stroke-[1.6]'
                        style={{ color: theme.labelIcon }}
                        aria-hidden='true'
                      />
                    </span>
                    <span
                      className='pt-1 text-sm leading-snug font-medium'
                      style={{ color: theme.labelText }}
                    >
                      {t(`home.comparison.${row.key}.label`)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div
              className='relative z-20 col-start-2 grid grid-rows-subgrid overflow-hidden rounded-[24px] border-2'
              style={{
                gridRow: `1 / span ${ROW_COUNT + 1}`,
                marginTop: `calc(-1 * ${AIHUB_COLUMN_FLOAT_OFFSET})`,
                marginBottom: `calc(-1 * ${AIHUB_COLUMN_FLOAT_OFFSET})`,
                marginLeft: '-0.35rem',
                marginRight: '-0.35rem',
                background: theme.aihubCardBg,
                borderColor: theme.aihubCardBorder,
                boxShadow: theme.aihubCardGlow,
              }}
            >
              <div
                className='relative flex min-h-[104px] items-center justify-center border-b px-7 py-5 text-center'
                style={{ borderColor: 'rgba(168, 200, 245, 0.55)' }}
              >
                <div className='flex min-w-0 flex-col items-center gap-2'>
                  <div className='flex items-center gap-3.5'>
                    <AihubMark className='size-14' />
                    <div className='min-w-0 text-left'>
                      <p
                        className='text-xl font-bold tracking-tight md:text-[1.35rem]'
                        style={{ color: theme.aihubTitle }}
                      >
                        {t('home.comparison.aihub')}
                      </p>
                      <p
                        className='mt-1 text-sm leading-snug'
                        style={{ color: theme.aihubSubtitle }}
                      >
                        {t('home.comparison.aihubSubtitle')}
                      </p>
                    </div>
                  </div>
                </div>
                <span
                  className='absolute top-3 right-4 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide text-white uppercase'
                  style={{
                    background: theme.badgeGradient,
                    boxShadow: theme.badgeShadow,
                  }}
                >
                  {t('home.comparison.aihubBadge')}
                </span>
              </div>
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.key}
                  className='border-b last:border-b-0'
                  style={{ borderColor: 'rgba(168, 200, 245, 0.45)' }}
                >
                  <ComparisonCell
                    tone='aihub'
                    icon={row.icon}
                    emphasized
                    title={t(`home.comparison.${row.key}.aihubTitle`)}
                    description={t(`home.comparison.${row.key}.aihubDescription`)}
                  />
                </div>
              ))}
            </div>

            <div
              className='col-start-3 row-span-full grid grid-rows-subgrid rounded-r-[28px] border border-l-0'
              style={{
                gridRow: `1 / span ${ROW_COUNT + 1}`,
                background: theme.competitorColumnBg,
                borderColor: theme.competitorColumnBorder,
                boxShadow: theme.cardShadow,
              }}
            >
              <div
                className='flex min-h-[92px] flex-col items-center justify-center border-b px-5 py-4 text-center'
                style={{ borderColor: theme.rowBorder }}
              >
                <p
                  className='text-lg font-bold tracking-tight'
                  style={{ color: theme.competitorTitle }}
                >
                  {t('home.comparison.competitor')}
                </p>
                <p
                  className='mt-1 text-sm leading-snug'
                  style={{ color: theme.competitorSubtitle }}
                >
                  {t('home.comparison.competitorSubtitle')}
                </p>
              </div>
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.key}
                  className='border-b last:border-b-0'
                  style={{ borderColor: theme.rowBorder }}
                >
                  <ComparisonCell
                    tone='competitor'
                    icon={row.icon}
                    title={t(`home.comparison.${row.key}.competitorTitle`)}
                    description={t(
                      `home.comparison.${row.key}.competitorDescription`
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className='lg:hidden'>
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
