/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTranslation } from 'react-i18next'

import { HOME_LIVE_MODELS, HOME_LIVE_VENDORS } from '../../constants'
import { BrandMark } from '../brand-mark'

interface StatsProps {
  className?: string
}

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()

  return (
    <div className='border-border/40 bg-muted/10 relative z-10 border-y'>
      <div className='mx-auto max-w-6xl px-6 py-10 md:py-12'>
        <p className='text-muted-foreground mb-6 text-center text-xs font-medium tracking-widest uppercase'>
          {t('Supported Models')}
        </p>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6'>
          {HOME_LIVE_VENDORS.map((vendor) => (
            <div
              key={vendor.name}
              className='border-border/50 bg-background flex flex-col items-center rounded-lg border px-4 py-5 text-center'
            >
              <BrandMark
                icon={vendor.icon}
                name={vendor.name}
                size={28}
                nameClassName='text-xl font-bold tracking-tight'
              />
              <span className='text-muted-foreground mt-2 text-xs'>
                {vendor.hint}
              </span>
            </div>
          ))}
        </div>
        <div className='mt-6 flex flex-wrap items-center justify-center gap-2.5'>
          {HOME_LIVE_MODELS.map((model) => (
            <span
              key={model}
              className='border-border/50 bg-background text-foreground/80 rounded-full border px-3.5 py-1.5 text-sm font-medium'
            >
              {model}
            </span>
          ))}
          <span className='border-border/50 text-foreground/80 rounded-full border bg-transparent px-3.5 py-1.5 text-sm font-medium'>
            {t('Continuing to expand...')}
          </span>
        </div>
      </div>
    </div>
  )
}
