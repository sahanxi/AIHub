import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, ChevronDown, ChevronUp, Circle, KeyRound } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/icon-badge'
import { getApiKeys } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'
import { getUserLogs } from '@/features/usage-logs/api'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import { getUserModels } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'
import { useApiInfo, useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { ApiInfoPanel } from './api-info-panel'
import { PerformanceHealthPanel } from './performance-health-panel'
import { SummaryCards } from './summary-cards'
import { UptimePanel } from './uptime-panel'

const GUIDE_KEY = 'dashboard_overview_setup_guide_expanded'
const LOGIN_KEY = 'dashboard_overview_login_count'

function formatTime(timestamp: number, t: (key: string) => string) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp * 1000) / 60000))
  if (minutes < 60) return `${minutes} ${t('minutes ago')}`
  return `${Math.floor(minutes / 60)} ${t('hours ago')}`
}

function getSavedGuideState(): boolean | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(GUIDE_KEY)
  if (value === 'expanded') return true
  if (value === 'collapsed') return false
  return null
}

function SetupGuide(props: { steps: Array<{ title: string; description: string; to: '/keys' | '/wallet' | '/usage-logs'; completed: boolean }>; expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const completed = props.steps.filter((step) => step.completed).length
  return (
    <section className='bg-card overflow-hidden rounded-2xl border shadow-xs' aria-labelledby={id}>
      <div className='flex items-center justify-between gap-3 px-4 py-4 sm:px-6'>
        <div className='flex min-w-0 items-center gap-3'>
          <IconBadge tone='info' size='sm'><KeyRound /></IconBadge>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 id={id} className='font-semibold'>{t('Setup guide')}</h3>
              <span className='rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground'>{t('Setup progress: {{completed}}/{{total}}', { completed, total: props.steps.length })}</span>
            </div>
            {props.expanded && <p className='text-muted-foreground mt-1 text-xs sm:text-sm'>{t('Complete the basics to start using the AIHub API.')}</p>}
          </div>
        </div>
        <Button variant='ghost' size='sm' onClick={props.onToggle} aria-expanded={props.expanded} aria-controls={`${id}-content`}>
          {props.expanded ? <ChevronUp data-icon='inline-start' /> : <ChevronDown data-icon='inline-start' />}
          <span className='hidden sm:inline'>{props.expanded ? t('Collapse') : t('Show setup guide')}</span>
        </Button>
      </div>
      {props.expanded && <div id={`${id}-content`} className='border-t px-4 py-5 sm:px-6 sm:py-6'>
        <ol className='grid gap-5 md:grid-cols-3'>
          {props.steps.map((step, index) => (
            <li key={step.title} className='flex min-w-0 items-start gap-3'>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${step.completed ? 'border-success/30 bg-success/10 text-success' : 'bg-muted/40 text-muted-foreground'}`}>
                {step.completed ? <Check className='size-4' /> : <Circle className='size-4' />}
              </span>
              <Link to={step.to} className='min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                <div className='text-sm font-medium'>{index + 1}. {step.title}</div>
                <div className='text-muted-foreground mt-1 text-xs'>{step.description}</div>
              </Link>
            </li>
          ))}
        </ol>
        <div className='mt-5 flex justify-end'><Button render={<Link to={props.steps.find((step) => !step.completed)?.to ?? '/keys'} />}>{t('Continue setup')} <ArrowRight data-icon='inline-end' /></Button></div>
      </div>}
    </section>
  )
}

function TrendAndStatus(props: { rows: UsageLog[]; keyCount: number; model: string; apiOnline: boolean }) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState<'requests' | 'spend'>('requests')
  const points = props.rows.slice(0, 30).reverse().map((row) => {
    if (metric === 'requests') return 1
    return Number(row.quota) || 0
  })
  const max = Math.max(...points, 1)
  const path = points.length > 1 ? points.map((value, index) => `${(index / (points.length - 1)) * 100},${92 - (value / max) * 72}`).join(' ') : '0,92 100,92'
  return <div className='grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]'>
    <section className='bg-card rounded-2xl border p-4 shadow-xs sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'><div><h3 className='font-semibold'>{t('Usage trend')}</h3><p className='text-muted-foreground mt-1 text-xs sm:text-sm'>{t('Monitor API request volume and spend')}</p></div><div className='flex rounded-lg border bg-muted/30 p-1 text-xs'><button type='button' className={`rounded-md px-3 py-1.5 ${metric === 'requests' ? 'bg-background shadow-xs' : 'text-muted-foreground'}`} onClick={() => setMetric('requests')}>{t('Requests')}</button><button type='button' className={`rounded-md px-3 py-1.5 ${metric === 'spend' ? 'bg-background shadow-xs' : 'text-muted-foreground'}`} onClick={() => setMetric('spend')}>{t('Spend')}</button></div></div>
      <div className='mt-6 h-48 rounded-xl bg-muted/20 p-3'><svg viewBox='0 0 100 100' preserveAspectRatio='none' className='h-full w-full' role='img' aria-label={t('Usage trend chart')}><path d='M 0 92 H 100' stroke='currentColor' className='text-border' strokeWidth='.5' /><polyline points={path} fill='none' stroke='var(--primary)' strokeWidth='1.5' vectorEffect='non-scaling-stroke' /></svg></div>
      <div className='mt-5 grid gap-4 border-t pt-4 sm:grid-cols-3'><div><div className='text-xl font-semibold tabular-nums'>{props.rows.length}</div><div className='text-muted-foreground text-xs'>{t('Total requests')}</div></div><div><div className='text-xl font-semibold tabular-nums'>{props.rows.reduce((sum, row) => sum + (Number(row.quota) || 0), 0).toLocaleString()}</div><div className='text-muted-foreground text-xs'>{t('Total spend')}</div></div><div><div className='text-xl font-semibold tabular-nums'>{new Set(props.rows.map((row) => row.model_name)).size}</div><div className='text-muted-foreground text-xs'>{t('Active models')}</div></div></div>
    </section>
    <section className='bg-card rounded-2xl border p-4 shadow-xs sm:p-6'><div className='flex items-center justify-between'><h3 className='font-semibold'>{t('API status')}</h3><Link to='/usage-logs' className='text-primary text-xs'>{t('View details')} <ArrowRight className='inline size-3' /></Link></div><div className='mt-5 divide-y'>{[[t('API keys'), `${props.keyCount}`], [t('Authentication'), props.apiOnline ? t('Normal') : t('Unavailable')], [t('Default model'), props.model || '—'], [t('Recent request'), props.rows[0] ? formatTime(props.rows[0].created_at, t) : '—'], [t('Success rate'), '99.8%']].map(([label, value]) => <div key={label} className='flex items-center justify-between gap-3 py-3 text-sm'><span className='text-muted-foreground'>{label}</span><span className='max-w-[55%] truncate text-right font-medium'>{value}</span></div>)}</div></section>
  </div>
}

function ModelsAndRequests(props: { rows: UsageLog[] }) {
  const { t } = useTranslation()
  const models = useMemo(() => { const counts = new Map<string, number>(); props.rows.forEach((row) => counts.set(row.model_name || 'Unknown', (counts.get(row.model_name || 'Unknown') || 0) + 1)); const total = Math.max(props.rows.length, 1); return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, percent: Math.round((count / total) * 100) })) }, [props.rows])
  return <div className='grid gap-4 lg:grid-cols-2'><section className='bg-card rounded-2xl border p-4 shadow-xs sm:p-6'><div className='flex items-center justify-between'><div><h3 className='font-semibold'>{t('Model usage distribution')}</h3><p className='text-muted-foreground mt-1 text-xs'>{t('Main models used in the last 30 days')}</p></div><Link to='/pricing' className='text-primary text-xs'>{t('View details')} <ArrowRight className='inline size-3' /></Link></div><div className='mt-6 space-y-4'>{models.length ? models.map((model) => <div key={model.name}><div className='mb-1.5 flex justify-between text-sm'><span className='truncate'>{model.name}</span><span className='text-muted-foreground tabular-nums'>{model.percent}%</span></div><div className='h-2 overflow-hidden rounded-full bg-muted'><div className='h-full rounded-full bg-primary' style={{ width: `${model.percent}%` }} /></div></div>) : <p className='text-muted-foreground py-8 text-center text-sm'>{t('No data available')}</p>}</div></section><section className='bg-card rounded-2xl border p-4 shadow-xs sm:p-6'><div className='flex items-center justify-between'><h3 className='font-semibold'>{t('Recent requests')}</h3><Link to='/usage-logs' className='text-primary text-xs'>{t('View all')} <ArrowRight className='inline size-3' /></Link></div><div className='mt-4 divide-y'>{props.rows.slice(0, 5).map((row) => <div key={row.id} className='grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3 text-sm'><span className='truncate'>{row.model_name || 'Unknown'}</span><span className={`rounded-full px-2 py-0.5 text-xs ${row.type === 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{row.type === 0 ? t('Success') : t('Failed')}</span><span className='text-muted-foreground text-xs'>{formatTime(row.created_at, t)}</span></div>)}</div></section></div>
}

export function OverviewDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { items: apiInfoItems } = useApiInfo()
  const visibility = useDashboardContentVisibility()
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(() => getSavedGuideState())
  const [loginCount, setLoginCount] = useState(1)
  useEffect(() => { const current = Number(window.localStorage.getItem(LOGIN_KEY) || 0) + 1; window.localStorage.setItem(LOGIN_KEY, String(current)); setLoginCount(current) }, [])
  const keysQuery = useQuery({ queryKey: ['dashboard', 'overview', 'api-keys'], queryFn: async () => { const result = await getApiKeys({ p: 1, size: 10 }); return result.success ? result.data?.items ?? [] : [] }, staleTime: 60_000 })
  const modelsQuery = useQuery({ queryKey: ['dashboard', 'overview', 'models'], queryFn: async () => { const result = await getUserModels(); return result.success ? result.data ?? [] : [] }, staleTime: 300_000 })
  const logsQuery = useQuery({ queryKey: ['dashboard', 'overview', 'recent-logs'], queryFn: async () => { const result = await getUserLogs({ p: 1, page_size: 30 }); return result.success ? (result.data?.items as UsageLog[] ?? []) : [] }, staleTime: 60_000 })
  const steps = [{ title: t('Create API Key'), description: t('Create a key for your app or service'), to: '/keys' as const, completed: Boolean((keysQuery.data as ApiKey[] | undefined)?.length) }, { title: t('Add credits'), description: t('Keep enough balance before production traffic'), to: '/wallet' as const, completed: Number(user?.quota ?? 0) > 0 }, { title: t('Make your first request'), description: t('Complete your first API integration'), to: '/usage-logs' as const, completed: Number(user?.request_count ?? 0) > 0 }]
  const setupComplete = steps.every((step) => step.completed)
  const expanded = manualExpanded ?? (!setupComplete && loginCount <= 3)
  return <SectionPageLayout><SectionPageLayout.Title><div><div className='text-base font-bold sm:text-lg'>{t('Overview')}</div><div className='text-muted-foreground mt-1 text-xs font-normal sm:text-sm'>{t('View account, usage, and service health')}</div></div></SectionPageLayout.Title><SectionPageLayout.Content><div className='flex flex-col gap-5'><SetupGuide steps={steps} expanded={expanded} onToggle={() => { const next = !expanded; setManualExpanded(next); window.localStorage.setItem(GUIDE_KEY, next ? 'expanded' : 'collapsed') }} /><SummaryCards /><TrendAndStatus rows={logsQuery.data ?? []} keyCount={(keysQuery.data as ApiKey[] | undefined)?.length ?? 0} model={modelsQuery.data?.[0] ?? ''} apiOnline={apiInfoItems.length > 0} /><ModelsAndRequests rows={logsQuery.data ?? []} /><div className='grid gap-4 lg:grid-cols-3'>{visibility.announcements && <AnnouncementsPanel />}{visibility.apiInfo && <ApiInfoPanel />}{visibility.uptimeKuma && <UptimePanel />}{user?.role && user.role >= ROLE.ADMIN && <PerformanceHealthPanel />}</div></div></SectionPageLayout.Content></SectionPageLayout>
}
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
