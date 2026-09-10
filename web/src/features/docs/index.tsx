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
import {
  InformationCircleIcon,
  Key01Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { PublicLayout } from '@/components/layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useStatus } from '@/hooks/use-status'
import { getPublicApiBaseUrl, getPublicOpenAIBaseUrl } from '@/lib/product'

import { CodeSamples } from './components/code-samples'
import {
  DocsDesktopSidebar,
  DocsMobileNavigation,
} from './components/docs-sidebar'
import { EndpointGroup } from './components/endpoint-group'
import { AI_API_GROUPS, MANAGEMENT_API_GROUPS } from './docs-data'
import type { DocsApiGroup } from './types'

function ApiGroupLinks(props: { groups: DocsApiGroup[] }) {
  const { t } = useTranslation()

  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {props.groups.map((group) => (
        <a key={group.id} href={`#${group.id}`} className='group block'>
          <Card className='group-hover:bg-muted/40 h-full transition-colors'>
            <CardHeader>
              <div className='bg-muted text-muted-foreground mb-2 flex size-9 items-center justify-center rounded-lg'>
                <HugeiconsIcon icon={group.icon} strokeWidth={1.8} />
              </div>
              <CardTitle>{t(group.titleKey)}</CardTitle>
              <CardDescription className='line-clamp-2 leading-relaxed'>
                {t(group.descriptionKey)}
              </CardDescription>
              <CardAction>
                <Badge variant='secondary'>
                  {t('{{count}} routes', { count: group.endpoints.length })}
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>
        </a>
      ))}
    </div>
  )
}

function SectionHeading(props: {
  id: string
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div id={props.id} className='scroll-mt-24'>
      <p className='text-primary mb-2 text-xs font-semibold tracking-widest uppercase'>
        {props.eyebrow}
      </p>
      <h2 className='text-2xl font-semibold tracking-tight'>{props.title}</h2>
      <p className='text-muted-foreground mt-2 max-w-3xl leading-relaxed'>
        {props.description}
      </p>
    </div>
  )
}

export function ApiDocs() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const apiOrigin = getPublicApiBaseUrl().replace(/\/+$/, '')
  const openAIBaseUrl = getPublicOpenAIBaseUrl()
  const version = typeof status?.version === 'string' ? status.version : null

  return (
    <PublicLayout showMainContainer={false}>
      <div className='pt-16'>
        <DocsMobileNavigation />
        <div className='mx-auto flex max-w-[96rem]'>
          <DocsDesktopSidebar />
          <main className='min-w-0 flex-1 px-4 py-10 sm:px-8 lg:px-10 lg:py-12'>
            <div className='mx-auto flex max-w-5xl flex-col gap-16'>
              <section id='overview' className='scroll-mt-24'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='secondary'>{t('API Reference')}</Badge>
                  {version ? <Badge variant='outline'>v{version}</Badge> : null}
                </div>
                <h1 className='mt-5 text-3xl font-bold tracking-tight sm:text-4xl'>
                  {t('AIHub API Reference')}
                </h1>
                <p className='text-muted-foreground mt-4 max-w-3xl text-base leading-relaxed sm:text-lg'>
                  {t(
                    'Use AIHub relay APIs to call AI models, or use the management APIs to automate permitted dashboard operations.'
                  )}
                </p>
                <Alert className='mt-6'>
                  <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                  <AlertDescription>
                    {t(
                      'Provider-specific capabilities still depend on the selected model, channel, and enabled task plugins.'
                    )}
                  </AlertDescription>
                </Alert>
              </section>

              <section id='quick-start' className='scroll-mt-24'>
                <SectionHeading
                  id='quick-start-heading'
                  eyebrow={t('API Reference')}
                  title={t('Quick start')}
                  description={t(
                    'Create an API key in the dashboard, select an available model, and send your first request. Never expose API keys in browser code or public repositories.'
                  )}
                />
                <div className='mt-6 grid gap-3 md:grid-cols-2'>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('API origin')}</CardTitle>
                      <CardDescription>
                        {t(
                          'Use this origin for native Claude and Gemini paths.'
                        )}
                      </CardDescription>
                      <CardAction>
                        <CopyButton value={apiOrigin} />
                      </CardAction>
                    </CardHeader>
                    <div className='px-4 pb-2'>
                      <code className='bg-muted block overflow-x-auto rounded-lg p-3 font-mono text-xs'>
                        {apiOrigin}
                      </code>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('OpenAI-compatible Base URL')}</CardTitle>
                      <CardDescription>
                        {t('Use this value in OpenAI-compatible SDK settings.')}
                      </CardDescription>
                      <CardAction>
                        <CopyButton value={openAIBaseUrl} />
                      </CardAction>
                    </CardHeader>
                    <div className='px-4 pb-2'>
                      <code className='bg-muted block overflow-x-auto rounded-lg p-3 font-mono text-xs'>
                        {openAIBaseUrl}
                      </code>
                    </div>
                  </Card>
                </div>
                <div className='mt-6'>
                  <CodeSamples />
                </div>
              </section>

              <section id='authentication-guide' className='scroll-mt-24'>
                <SectionHeading
                  id='authentication-heading'
                  eyebrow={t('Security')}
                  title={t('Authentication')}
                  description={t(
                    'AI model APIs and management APIs use different credentials. Do not use a dashboard access token as a relay API key, or a relay API key as a dashboard access token.'
                  )}
                />
                <div className='mt-6 grid gap-3 md:grid-cols-2'>
                  <Card>
                    <CardHeader>
                      <div className='bg-muted text-muted-foreground mb-2 flex size-9 items-center justify-center rounded-lg'>
                        <HugeiconsIcon icon={Key01Icon} strokeWidth={1.8} />
                      </div>
                      <CardTitle>{t('Relay API key')}</CardTitle>
                      <CardDescription className='leading-relaxed'>
                        {t(
                          'Used by /v1, /v1beta, /mj, and task relay routes. The standard form is Authorization: Bearer sk-..., while native Claude and Gemini headers are also accepted on their compatible routes.'
                        )}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <div className='bg-muted text-muted-foreground mb-2 flex size-9 items-center justify-center rounded-lg'>
                        <HugeiconsIcon icon={Shield01Icon} strokeWidth={1.8} />
                      </div>
                      <CardTitle>{t('Dashboard authentication')}</CardTitle>
                      <CardDescription className='leading-relaxed'>
                        {t(
                          'Management routes use a live dashboard session or Authorization: Bearer with a dashboard access token. User, Admin, Root, and fine-grained permission checks are enforced by the server.'
                        )}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
                <Alert className='mt-4'>
                  <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                  <AlertTitle>{t('Header compatibility')}</AlertTitle>
                  <AlertDescription>
                    {t(
                      'Claude routes accept x-api-key. Gemini model routes accept x-goog-api-key or the key query parameter. Authorization: Bearer remains the recommended general form.'
                    )}
                  </AlertDescription>
                </Alert>
              </section>

              <section id='errors' className='scroll-mt-24'>
                <SectionHeading
                  id='errors-heading'
                  eyebrow={t('Reliability')}
                  title={t('Errors and rate limits')}
                  description={t(
                    'Handle non-2xx responses and network failures. A 401 usually indicates a missing or invalid credential, 403 indicates a disabled account or insufficient permission, 429 indicates rate limiting or quota pressure, and 5xx responses indicate a gateway or upstream failure.'
                  )}
                />
                <p className='text-muted-foreground mt-4 text-sm leading-relaxed'>
                  {t(
                    'For retryable 429 and 5xx failures, use exponential backoff with jitter and a strict retry limit. Do not automatically retry validation, authentication, or permission failures.'
                  )}
                </p>
              </section>

              <Separator />

              <section id='ai-model-apis' className='scroll-mt-24'>
                <SectionHeading
                  id='ai-model-heading'
                  eyebrow={t('Directory')}
                  title={t('AI Model APIs')}
                  description={t(
                    'Customer-facing inference routes. Every available route below is registered by the current AIHub server; conditional routes additionally require a compatible configured channel or enabled task plugin.'
                  )}
                />
                <div className='mt-6'>
                  <ApiGroupLinks groups={AI_API_GROUPS} />
                </div>
              </section>

              <div className='flex flex-col gap-6'>
                {AI_API_GROUPS.map((group) => (
                  <EndpointGroup key={group.id} group={group} />
                ))}
              </div>

              <Separator />

              <section id='management-apis' className='scroll-mt-24'>
                <SectionHeading
                  id='management-heading'
                  eyebrow={t('Directory')}
                  title={t('Management APIs')}
                  description={t(
                    'Dashboard and operator automation routes. They are permission-sensitive and can change with the console; prefer the public AI model APIs for customer integrations.'
                  )}
                />
                <Alert className='mt-6'>
                  <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
                  <AlertTitle>{t('Management API scope')}</AlertTitle>
                  <AlertDescription>
                    {t(
                      'Public means no login middleware is attached, but setup state, feature switches, rate limits, request validation, and provider callback signatures can still restrict access. Never call payment callback routes directly.'
                    )}
                  </AlertDescription>
                </Alert>
                <div className='mt-6'>
                  <ApiGroupLinks groups={MANAGEMENT_API_GROUPS} />
                </div>
              </section>

              <div className='flex flex-col gap-6'>
                {MANAGEMENT_API_GROUPS.map((group) => (
                  <EndpointGroup key={group.id} group={group} />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </PublicLayout>
  )
}
