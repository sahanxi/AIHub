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
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPublicOpenAIBaseUrl } from '@/lib/product'
import { cn } from '@/lib/utils'

type ExampleTab = 'curl' | 'python'

const EXAMPLE_TABS: ExampleTab[] = ['curl', 'python']
const CYCLE_INTERVAL = 4500
const TRANSITION_MS = 220

export function ApiExample() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ExampleTab>('curl')
  const [transitioning, setTransitioning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    intervalRef.current = setInterval(() => {
      setTransitioning(true)
      timeoutRef.current = setTimeout(() => {
        setTab((prev) => (prev === 'curl' ? 'python' : 'curl'))
        setTransitioning(false)
      }, TRANSITION_MS)
    }, CYCLE_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleSelect = (value: string) => {
    const next = value as ExampleTab
    if (next === tab) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setTransitioning(true)
    timeoutRef.current = setTimeout(() => {
      setTab(next)
      setTransitioning(false)
    }, TRANSITION_MS)
  }

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
        </AnimateInView>
        <div className='overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-sky-500/6 to-violet-500/8 p-[1px] shadow-[0_20px_50px_-28px_rgba(16,185,129,0.35)]'>
          <div className='bg-card/95 overflow-hidden rounded-[15px] backdrop-blur-sm'>
            <Tabs value={tab} onValueChange={handleSelect}>
              <div className='flex items-center justify-between gap-3 border-b px-5 py-3'>
                <TabsList variant='line' className='h-8'>
                  {EXAMPLE_TABS.map((item) => (
                    <TabsTrigger key={item} value={item}>
                      {item === 'curl' ? 'cURL' : 'Python'}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <span className='rounded-md bg-emerald-500/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400'>
                  POST
                </span>
              </div>
              <div className='relative px-5 py-4'>
                <CopyButton
                  value={samples[tab]}
                  className='text-muted-foreground hover:text-foreground absolute top-3 right-4 size-8'
                  tooltip={t('Copy code')}
                />
                <div
                  className={cn(
                    'pr-10 font-mono text-[12.5px] leading-[1.55] transition-opacity duration-200',
                    transitioning ? 'opacity-0' : 'opacity-100'
                  )}
                >
                  {tab === 'curl' ? (
                    <CurlSample baseUrl={baseUrl} />
                  ) : (
                    <PythonSample baseUrl={baseUrl} />
                  )}
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  )
}

function CurlSample(props: { baseUrl: string }) {
  return (
    <div>
      <CodeLine>
        <Command>curl</Command>{' '}
        <StringText>{props.baseUrl}/chat/completions</StringText>{' '}
        <Muted>\</Muted>
      </CodeLine>
      <CodeLine indent={2}>
        <Flag>-H</Flag>{' '}
        <StringText>&quot;Content-Type: application/json&quot;</StringText>{' '}
        <Muted>\</Muted>
      </CodeLine>
      <CodeLine indent={2}>
        <Flag>-H</Flag>{' '}
        <StringText>&quot;Authorization: Bearer $API_KEY&quot;</StringText>{' '}
        <Muted>\</Muted>
      </CodeLine>
      <CodeLine indent={2}>
        <Flag>-d</Flag> <StringText>&apos;{'{'}</StringText>
      </CodeLine>
      <CodeLine indent={4}>
        <Key>&quot;model&quot;</Key>
        <Muted>: </Muted>
        <StringText>&quot;gpt-4o-mini&quot;</StringText>
        <Muted>,</Muted>
      </CodeLine>
      <CodeLine indent={4}>
        <Key>&quot;messages&quot;</Key>
        <Muted>: [{'{'}</Muted>
        <Key>&quot;role&quot;</Key>
        <Muted>: </Muted>
        <StringText>&quot;user&quot;</StringText>
        <Muted>, </Muted>
        <Key>&quot;content&quot;</Key>
        <Muted>: </Muted>
        <StringText>&quot;Hello&quot;</StringText>
        <Muted>{'}'}]</Muted>
      </CodeLine>
      <CodeLine indent={2}>
        <StringText>{'}'}&apos;</StringText>
      </CodeLine>
    </div>
  )
}

function PythonSample(props: { baseUrl: string }) {
  return (
    <div>
      <CodeLine>
        <Command>from</Command> <Muted> openai </Muted>
        <Command>import</Command> <Muted> OpenAI</Muted>
      </CodeLine>
      <CodeLine>
        <Muted> </Muted>
      </CodeLine>
      <CodeLine>
        <Muted>client = OpenAI(</Muted>
      </CodeLine>
      <CodeLine indent={4}>
        <Muted>api_key=</Muted>
        <StringText>&quot;your-api-key&quot;</StringText>
        <Muted>,</Muted>
      </CodeLine>
      <CodeLine indent={4}>
        <Muted>base_url=</Muted>
        <StringText>&quot;{props.baseUrl}&quot;</StringText>
        <Muted>,</Muted>
      </CodeLine>
      <CodeLine>
        <Muted>)</Muted>
      </CodeLine>
      <CodeLine>
        <Muted> </Muted>
      </CodeLine>
      <CodeLine>
        <Muted>resp = client.chat.completions.create(</Muted>
      </CodeLine>
      <CodeLine indent={4}>
        <Muted>model=</Muted>
        <StringText>&quot;gpt-4o-mini&quot;</StringText>
        <Muted>,</Muted>
      </CodeLine>
      <CodeLine indent={4}>
        <Muted>messages=[{'{'}</Muted>
        <StringText>&quot;role&quot;</StringText>
        <Muted>: </Muted>
        <StringText>&quot;user&quot;</StringText>
        <Muted>, </Muted>
        <StringText>&quot;content&quot;</StringText>
        <Muted>: </Muted>
        <StringText>&quot;Hello&quot;</StringText>
        <Muted>{'}'}],</Muted>
      </CodeLine>
      <CodeLine>
        <Muted>)</Muted>
      </CodeLine>
      <CodeLine>
        <Command>print</Command>
        <Muted>(resp.choices[</Muted>
        <NumberText>0</NumberText>
        <Muted>].message.content)</Muted>
      </CodeLine>
    </div>
  )
}

function CodeLine(props: { children: ReactNode; indent?: number }) {
  return (
    <div className='break-words whitespace-pre-wrap'>
      {props.indent ? (
        <span
          aria-hidden
          className='inline-block'
          style={{ width: `${props.indent}ch` }}
        />
      ) : null}
      {props.children}
    </div>
  )
}

function Command(props: { children: ReactNode }) {
  return (
    <span className='font-medium text-emerald-600 dark:text-emerald-400'>
      {props.children}
    </span>
  )
}

function Flag(props: { children: ReactNode }) {
  return (
    <span className='text-blue-600 dark:text-blue-400'>{props.children}</span>
  )
}

function Key(props: { children: ReactNode }) {
  return (
    <span className='text-sky-700 dark:text-sky-300'>{props.children}</span>
  )
}

function StringText(props: { children: ReactNode }) {
  return (
    <span className='text-amber-700 dark:text-amber-300'>{props.children}</span>
  )
}

function NumberText(props: { children: ReactNode }) {
  return (
    <span className='font-medium text-violet-600 dark:text-violet-300'>
      {props.children}
    </span>
  )
}

function Muted(props: { children: ReactNode }) {
  return <span className='text-foreground/55'>{props.children}</span>
}
