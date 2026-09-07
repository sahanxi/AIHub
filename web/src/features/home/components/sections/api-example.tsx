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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { getPublicOpenAIBaseUrl } from '@/lib/product'

type ExampleTab = 'curl' | 'python'

export function ApiExample() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ExampleTab>('curl')
  const baseUrl = getPublicOpenAIBaseUrl()

  const samples = useMemo(
    () => ({
      curl: `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $API_KEY" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
      python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${baseUrl}",
)

resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)`,
    }),
    [baseUrl]
  )

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-20 md:py-24'>
      <div className='mx-auto max-w-3xl'>
        <AnimateInView className='mb-8 text-center'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('API Example')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('OpenAI-compatible by default')}
          </h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-xl text-sm'>
            {t('Base URL')}: <code className='font-mono text-xs'>{baseUrl}</code>
          </p>
        </AnimateInView>
        <div className='border-border/50 bg-card overflow-hidden rounded-xl border'>
          <div className='flex gap-1 border-b px-3 py-2'>
            {(['curl', 'python'] as const).map((item) => (
              <button
                key={item}
                type='button'
                className={
                  tab === item
                    ? 'bg-muted rounded-md px-3 py-1.5 text-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs'
                }
                onClick={() => setTab(item)}
              >
                {item === 'curl' ? 'cURL' : 'Python'}
              </button>
            ))}
          </div>
          <pre className='overflow-x-auto p-4 font-mono text-xs leading-relaxed sm:text-sm'>
            {samples[tab]}
          </pre>
        </div>
      </div>
    </section>
  )
}
