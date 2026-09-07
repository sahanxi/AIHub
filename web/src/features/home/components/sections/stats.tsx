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

interface StatsProps {
  className?: string
}

const PROVIDERS = [
  { name: 'GPT', hint: 'OpenAI' },
  { name: 'Claude', hint: 'Anthropic' },
  { name: 'Gemini', hint: 'Google' },
] as const

export function Stats(_props: StatsProps) {
  const { t } = useTranslation()

  return (
    <div className='border-border/40 bg-muted/10 relative z-10 border-y'>
      <div className='mx-auto max-w-6xl px-6 py-10 md:py-12'>
        <p className='text-muted-foreground mb-6 text-center text-xs font-medium tracking-widest uppercase'>
          {t('Supported Models')}
        </p>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8'>
          {PROVIDERS.map((provider) => (
            <div
              key={provider.name}
              className='border-border/50 bg-background flex flex-col items-center rounded-lg border px-4 py-5 text-center'
            >
              <span className='text-xl font-semibold tracking-tight'>
                {provider.name}
              </span>
              <span className='text-muted-foreground mt-1 text-xs'>
                {provider.hint}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
