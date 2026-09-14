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
import { Globe, Layers, Plug, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()

  const features = [
    {
      id: 'models',
      title: t('One API, many models'),
      desc: t(
        'Call GPT, Claude, Gemini, Grok, and other official AI models through one interface.'
      ),
      icon: <Layers className='size-4' />,
    },
    {
      id: 'official',
      title: t('Official channels, stable and reliable'),
      desc: t(
        'Connect to official model services to protect capability, output quality, and call stability.'
      ),
      icon: <ShieldCheck className='size-4' />,
    },
    {
      id: 'compat',
      title: t('Compatible with leading APIs'),
      desc: t(
        'Compatible with the OpenAI API and Claude Messages, so existing apps can migrate quickly at low cost.'
      ),
      icon: <Plug className='size-4' />,
    },
    {
      id: 'nodes',
      title: t('Global multi-node acceleration'),
      desc: t(
        'Intelligent routing across regions for secure connections, stable service, and fast responses.'
      ),
      icon: <Globe className='size-4' />,
    },
  ]

  return (
    <section className='relative z-10 px-6 py-20 md:py-24'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-12 text-center'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('Core values')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t(
              'Unified multi-model access | Official channels | Leading API compatibility | Global node acceleration'
            )}
          </h2>
          <p className='text-muted-foreground mx-auto mt-4 max-w-3xl text-sm leading-relaxed'>
            {t(
              'Call ChatGPT, Claude, Gemini, Grok, and other official AI models through one API. Official channels protect quality and stability; global nodes accelerate for security and speed. Compatible with the OpenAI API and Claude Messages so existing apps can connect quickly.'
            )}
          </p>
        </AnimateInView>
        <div className='grid gap-4 sm:grid-cols-2'>
          {features.map((feature, index) => (
            <AnimateInView
              key={feature.id}
              delay={index * 80}
              animation='fade-up'
              className='border-border/50 bg-card rounded-xl border p-5'
            >
              <div className='text-muted-foreground mb-3'>{feature.icon}</div>
              <h3 className='text-base font-semibold'>{feature.title}</h3>
              <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                {feature.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
