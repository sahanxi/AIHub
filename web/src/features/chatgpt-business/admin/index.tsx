import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dayjs from '@/lib/dayjs'

import {
  activateAdminBusinessSubscription,
  addAdminBusinessSeats,
  confirmAdminRemoved,
  confirmAdminSeatAdded,
  createAdminBusinessPrice,
  createAdminBusinessWorkspace,
  deleteAdminBusinessWorkspace,
  disableAdminBusinessSeat,
  enableAdminBusinessSeat,
  getAdminBusinessOrders,
  getAdminBusinessOverview,
  getAdminBusinessPricing,
  getAdminBusinessSeats,
  getAdminBusinessSubscriptions,
  getAdminBusinessTasks,
  getAdminBusinessWorkspaces,
  isApiSuccess,
  markAdminBusinessInvited,
  removeAdminBusinessSeat,
  updateAdminBusinessWorkspace,
} from '../api'
import {
  BUSINESS_BILLING_CADENCES,
  BUSINESS_PRICE_CURRENCIES,
  getBillingCadenceLabelKey,
} from '../constants'
import {
  BusinessSeatStatusBadge,
  BusinessSubscriptionStatusBadge,
  BusinessTaskStatusBadge,
  BusinessTaskTypeBadge,
  ImportantTimestamp,
} from '../status-display'
import type {
  BusinessPriceVersion,
  BusinessSeat,
  BusinessSeatOrder,
  BusinessSeatTask,
  BusinessSubscription,
  BusinessWorkspace,
} from '../types'
import { formatWorkspaceSubscriptionSummaryFromWorkspace } from '../workspace-summary'
import {
  WorkspaceBillingAnchorField,
  WorkspaceBillingCadenceField,
  WorkspaceGraceMinutesField,
  WorkspaceRenewalLeadDaysField,
  WorkspaceNameField,
  WorkspaceSubscriptionDescriptionField,
  WorkspaceProviderField,
  WorkspaceSeatCountField,
  WorkspaceTimezoneField,
} from './workspace-form-fields'

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  return dayjs.unix(ts).format('YYYY-MM-DD HH:mm')
}

function maskEmail(email: string) {
  const at = email.indexOf('@')
  if (at <= 1) return email
  return `${email.slice(0, 1)}***${email.slice(at)}`
}

type OverviewDetailKey =
  | 'active_users'
  | 'available_seats'
  | 'pending_activation'
  | 'cash_collected'

export function ChatGPTBusinessAdminPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null)
  const [workspaces, setWorkspaces] = useState<BusinessWorkspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null
  )
  const [seats, setSeats] = useState<BusinessSeat[]>([])
  const [seatStatusFilter, setSeatStatusFilter] = useState('ALL')
  const [tasks, setTasks] = useState<BusinessSeatTask[]>([])
  const [subscriptions, setSubscriptions] = useState<BusinessSubscription[]>([])
  const [orders, setOrders] = useState<BusinessSeatOrder[]>([])
  const [currentPrice, setCurrentPrice] = useState<BusinessPriceVersion | null>(
    null
  )
  const [priceAmount, setPriceAmount] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [billingCadence, setBillingCadence] = useState('MONTHLY')
  const [displayUnit, setDisplayUnit] = useState('/ month')
  const [pricingWorkspaceId, setPricingWorkspaceId] = useState<number | null>(
    null
  )
  const [overviewDetail, setOverviewDetail] =
    useState<OverviewDetailKey | null>(null)
  const [overviewAvailableSeats, setOverviewAvailableSeats] = useState<
    BusinessSeat[]
  >([])
  const [removeSeatTarget, setRemoveSeatTarget] = useState<BusinessSeat | null>(
    null
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wsDescription, setWsDescription] = useState('')
  const [wsProvider, setWsProvider] = useState('OPENAI')
  const [wsCadence, setWsCadence] = useState('MONTHLY')
  const [wsAnchor, setWsAnchor] = useState<Date | undefined>()
  const [wsTimezone, setWsTimezone] = useState('Asia/Shanghai')
  const [wsSeats, setWsSeats] = useState('3')
  const [wsGrace, setWsGrace] = useState('60')
  const [wsRenewalLead, setWsRenewalLead] = useState('3')

  const [addSeatOpen, setAddSeatOpen] = useState(false)
  const [addSeatCount, setAddSeatCount] = useState('1')
  const [addSeatConfirmed, setAddSeatConfirmed] = useState(false)
  const [addSeatWorkspaceId, setAddSeatWorkspaceId] = useState<number | null>(
    null
  )

  const [editOpen, setEditOpen] = useState(false)
  const [editWorkspace, setEditWorkspace] = useState<BusinessWorkspace | null>(
    null
  )
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTimezone, setEditTimezone] = useState('')
  const [editGrace, setEditGrace] = useState('')
  const [editRenewalLead, setEditRenewalLead] = useState('3')
  const [editAnchor, setEditAnchor] = useState<Date | undefined>()
  const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] =
    useState<BusinessWorkspace | null>(null)

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find((w) => w.id === selectedWorkspaceId) ??
      workspaces[0] ??
      null,
    [workspaces, selectedWorkspaceId]
  )

  const pricingWorkspace = useMemo(
    () => workspaces.find((w) => w.id === pricingWorkspaceId) ?? null,
    [workspaces, pricingWorkspaceId]
  )

  const workspaceNameById = useMemo(
    () => new Map(workspaces.map((ws) => [ws.id, ws.name])),
    [workspaces]
  )

  const loadPricing = useCallback(async (workspaceId: number | null) => {
    const pricingRes = await getAdminBusinessPricing(workspaceId ?? undefined)
    if (isApiSuccess(pricingRes)) setCurrentPrice(pricingRes.data.current)
  }, [])

  const loadCore = useCallback(async () => {
    const [overviewRes, wsRes, subsRes, ordersRes, tasksRes] =
      await Promise.all([
        getAdminBusinessOverview(),
        getAdminBusinessWorkspaces(),
        getAdminBusinessSubscriptions(),
        getAdminBusinessOrders(),
        getAdminBusinessTasks(),
      ])
    if (isApiSuccess(overviewRes)) setOverview(overviewRes.data)
    if (isApiSuccess(wsRes)) {
      setWorkspaces(wsRes.data)
      if (wsRes.data.length > 0) {
        setSelectedWorkspaceId((prev) => prev ?? wsRes.data[0].id)
        setPricingWorkspaceId((prev) => prev ?? wsRes.data[0].id)
      }
    }
    if (isApiSuccess(subsRes)) setSubscriptions(subsRes.data.items)
    if (isApiSuccess(ordersRes)) setOrders(ordersRes.data.items)
    if (isApiSuccess(tasksRes)) setTasks(tasksRes.data)
  }, [])

  const loadSeats = useCallback(
    async (workspaceId: number, status = seatStatusFilter) => {
      const res = await getAdminBusinessSeats(workspaceId, status)
      if (isApiSuccess(res)) setSeats(res.data.seats)
    },
    [seatStatusFilter]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await loadCore()
    } finally {
      setLoading(false)
    }
  }, [loadCore])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (selectedWorkspace?.id) {
      void loadSeats(selectedWorkspace.id, seatStatusFilter)
    }
  }, [selectedWorkspace?.id, seatStatusFilter, loadSeats])

  useEffect(() => {
    if (pricingWorkspaceId != null) {
      void loadPricing(pricingWorkspaceId)
    }
  }, [loadPricing, pricingWorkspaceId])

  useEffect(() => {
    if (overviewDetail !== 'available_seats' || workspaces.length === 0) {
      if (overviewDetail !== 'available_seats') {
        setOverviewAvailableSeats([])
      }
      return
    }
    let cancelled = false
    void (async () => {
      const merged: BusinessSeat[] = []
      for (const ws of workspaces) {
        const res = await getAdminBusinessSeats(ws.id)
        if (isApiSuccess(res)) {
          merged.push(
            ...res.data.seats.filter((seat) => seat.status === 'AVAILABLE')
          )
        }
      }
      if (!cancelled) {
        setOverviewAvailableSeats(merged)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [overviewDetail, workspaces])

  const refresh = async () => {
    await loadCore()
    if (selectedWorkspace?.id) await loadSeats(selectedWorkspace.id)
  }

  const savePrice = async () => {
    if (pricingWorkspaceId == null) {
      toast.error(t('Select a workspace for pricing'))
      return
    }
    const res = await createAdminBusinessPrice({
      workspace_id: pricingWorkspaceId,
      price_amount: priceAmount,
      currency,
      billing_cadence: billingCadence,
      display_unit: displayUnit,
    })
    if (isApiSuccess(res)) {
      toast.success(t('Price saved'))
      void refresh()
    } else {
      toast.error(res.message || t('Unable to save price'))
    }
  }

  const createWorkspace = async () => {
    if (!wsName.trim() || !wsAnchor) {
      toast.error(t('Name and billing anchor required'))
      return
    }
    const res = await createAdminBusinessWorkspace({
      name: wsName.trim(),
      subscription_description: wsDescription.trim(),
      provider: wsProvider,
      billing_cadence: wsCadence,
      billing_anchor_at: Math.floor(wsAnchor.getTime() / 1000),
      billing_timezone: wsTimezone,
      cycle_start_grace_minutes: Number(wsGrace) || 60,
      renewal_lead_days: Number(wsRenewalLead) || 3,
      total_standard_seats: Number(wsSeats) || 1,
    })
    if (isApiSuccess(res)) {
      toast.success(t('Workspace created'))
      setCreateOpen(false)
      setWsName('')
      setWsDescription('')
      void refresh()
    } else {
      toast.error(res.message || t('Unable to create workspace'))
    }
  }

  const openEditWorkspace = (ws: BusinessWorkspace) => {
    setEditWorkspace(ws)
    setEditName(ws.name)
    setEditDescription(ws.subscription_description ?? '')
    setEditTimezone(ws.billing_timezone)
    setEditGrace(String(ws.cycle_start_grace_minutes))
    setEditRenewalLead(String(ws.renewal_lead_days ?? 3))
    setEditAnchor(new Date(ws.billing_anchor_at * 1000))
    setEditOpen(true)
  }

  const saveWorkspaceEdit = async () => {
    if (!editWorkspace) return
    const body: {
      name?: string
      subscription_description?: string
      billing_timezone?: string
      cycle_start_grace_minutes?: number
      renewal_lead_days?: number
      billing_anchor_at?: number
    } = {
      name: editName.trim(),
      subscription_description: editDescription.trim(),
      billing_timezone: editTimezone.trim(),
      cycle_start_grace_minutes:
        Number(editGrace) || editWorkspace.cycle_start_grace_minutes,
      renewal_lead_days: Number(editRenewalLead),
    }
    if ((editWorkspace.active_subscriptions ?? 0) === 0 && editAnchor) {
      body.billing_anchor_at = Math.floor(editAnchor.getTime() / 1000)
    }
    const res = await updateAdminBusinessWorkspace(editWorkspace.id, body)
    if (isApiSuccess(res)) {
      toast.success(t('Workspace updated'))
      setEditOpen(false)
      void refresh()
    } else {
      toast.error(res.message || t('Unable to update workspace'))
    }
  }

  const deleteWorkspace = async () => {
    if (!deleteWorkspaceTarget) return
    const res = await deleteAdminBusinessWorkspace(deleteWorkspaceTarget.id)
    if (isApiSuccess(res)) {
      toast.success(t('Workspace deleted'))
      if (selectedWorkspaceId === deleteWorkspaceTarget.id) {
        setSelectedWorkspaceId(null)
      }
      if (pricingWorkspaceId === deleteWorkspaceTarget.id) {
        setPricingWorkspaceId(null)
      }
      setDeleteWorkspaceTarget(null)
      void refresh()
    } else {
      toast.error(res.message || t('Unable to delete workspace'))
    }
  }

  const confirmAddSeats = async () => {
    if (!addSeatWorkspaceId || !addSeatConfirmed) return
    const count = Number(addSeatCount)
    if (count <= 0) return
    const res = await addAdminBusinessSeats(addSeatWorkspaceId, count)
    if (isApiSuccess(res)) {
      toast.success(t('Seats added'))
      setAddSeatOpen(false)
      setAddSeatConfirmed(false)
      void refresh()
    } else {
      toast.error(res.message || t('Unable to add seats'))
    }
  }

  const runAction = async (
    action: () => Promise<{ success: boolean; message: string }>,
    okMsg: string
  ) => {
    const res = await action()
    if (res.success) {
      toast.success(t(okMsg))
      void refresh()
    } else {
      toast.error(res.message || t('Action failed'))
    }
  }

  if (loading) return <LoadingState />

  const pool = overview?.pool as { available_seats?: number } | undefined

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === 'ACTIVE'
  )
  const pendingActivationSubscriptions = subscriptions.filter((sub) =>
    ['PENDING_ACTIVATION', 'INVITED', 'PENDING_CAPACITY'].includes(sub.status)
  )
  const availableSeats = seats.filter((seat) => seat.status === 'AVAILABLE')
  const paidOrders = orders.filter((order) => order.status === 'PAID')

  const overviewDetailTitle: Record<OverviewDetailKey, string> = {
    active_users: t('Active Users'),
    available_seats: t('Available Seats'),
    pending_activation: t('Pending Activation'),
    cash_collected: t('Cash Collected'),
  }

  const overviewCards: Array<{
    key: OverviewDetailKey
    label: string
    value: string
  }> = [
    {
      key: 'active_users',
      label: t('Active Users'),
      value: String(overview?.active_users ?? activeSubscriptions.length),
    },
    {
      key: 'available_seats',
      label: t('Available Seats'),
      value: String(pool?.available_seats ?? availableSeats.length),
    },
    {
      key: 'pending_activation',
      label: t('Pending Activation'),
      value: String(
        overview?.pending_activation ?? pendingActivationSubscriptions.length
      ),
    },
    {
      key: 'cash_collected',
      label: t('Cash Collected'),
      value: String(overview?.cash_collected ?? 0),
    },
  ]

  const confirmRemoveSeat = async () => {
    if (!removeSeatTarget) return
    await runAction(
      () => removeAdminBusinessSeat(removeSeatTarget.id),
      'Seat removal requested'
    )
    setRemoveSeatTarget(null)
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {t('ChatGPT Business')}
          </h1>
          <p className='text-muted-foreground text-sm'>
            {t('Manage workspaces, pricing, and activations')}
          </p>
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className='max-w-full flex-wrap justify-start'>
            <TabsTrigger value='overview'>{t('Overview')}</TabsTrigger>
            <TabsTrigger value='workspaces'>{t('Workspaces')}</TabsTrigger>
            <TabsTrigger value='seats'>{t('Seat Pool')}</TabsTrigger>
            <TabsTrigger value='tasks'>{t('Tasks')}</TabsTrigger>
            <TabsTrigger value='subscriptions'>
              {t('Subscriptions')}
            </TabsTrigger>
            <TabsTrigger value='pricing'>{t('Pricing')}</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='mt-4 space-y-4'>
            {overviewDetail == null ? (
              <div className='grid gap-4 md:grid-cols-4'>
                {overviewCards.map((card) => (
                  <Card
                    key={card.key}
                    className='hover:border-primary/40 hover:bg-muted/20 cursor-pointer transition-colors'
                    onClick={() => setOverviewDetail(card.key)}
                  >
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm font-medium'>
                        {card.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='text-2xl font-semibold tabular-nums'>
                      {card.value}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setOverviewDetail(null)}
                  >
                    {t('Back')}
                  </Button>
                  <h2 className='text-lg font-semibold'>
                    {overviewDetailTitle[overviewDetail]}
                  </h2>
                </div>
                {overviewDetail === 'active_users' && (
                  <div className='overflow-x-auto rounded-lg border'>
                    <table className='w-full min-w-[640px] text-sm'>
                      <thead className='bg-muted/50 text-left'>
                        <tr>
                          <th className='p-2'>{t('ChatGPT Email')}</th>
                          <th className='p-2'>{t('Status')}</th>
                          <th className='p-2'>{t('Activated At')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSubscriptions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className='text-muted-foreground p-4'
                            >
                              {t('No subscriptions yet')}
                            </td>
                          </tr>
                        ) : (
                          activeSubscriptions.map((sub) => (
                            <tr key={sub.id} className='border-t'>
                              <td className='p-2'>{sub.chatgpt_email}</td>
                              <td className='p-2'>
                                <BusinessSubscriptionStatusBadge
                                  status={sub.status}
                                  t={t}
                                />
                              </td>
                              <td className='p-2'>
                                <ImportantTimestamp
                                  ts={sub.activated_at}
                                  format={formatTs}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {overviewDetail === 'available_seats' && (
                  <div className='overflow-x-auto rounded-lg border'>
                    <table className='w-full min-w-[640px] text-sm'>
                      <thead className='bg-muted/50 text-left'>
                        <tr>
                          <th className='p-2'>{t('Workspace')}</th>
                          <th className='p-2'>{t('Seat Number')}</th>
                          <th className='p-2'>{t('Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overviewAvailableSeats.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className='text-muted-foreground p-4'
                            >
                              {t('No available seats')}
                            </td>
                          </tr>
                        ) : (
                          overviewAvailableSeats.map((seat) => (
                            <tr key={seat.id} className='border-t'>
                              <td className='p-2'>
                                {workspaceNameById.get(seat.workspace_id) ??
                                  '—'}
                              </td>
                              <td className='p-2'>
                                #{String(seat.seat_number).padStart(3, '0')}
                              </td>
                              <td className='p-2'>
                                <BusinessSeatStatusBadge
                                  status={seat.status}
                                  t={t}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {overviewDetail === 'pending_activation' && (
                  <div className='overflow-x-auto rounded-lg border'>
                    <table className='w-full min-w-[720px] text-sm'>
                      <thead className='bg-muted/50 text-left'>
                        <tr>
                          <th className='p-2'>{t('ChatGPT Email')}</th>
                          <th className='p-2'>{t('Status')}</th>
                          <th className='p-2'>{t('Created At')}</th>
                          <th className='p-2'>{t('Tasks')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingActivationSubscriptions.length === 0 &&
                        tasks.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className='text-muted-foreground p-4'
                            >
                              {t('No pending tasks')}
                            </td>
                          </tr>
                        ) : (
                          <>
                            {pendingActivationSubscriptions.map((sub) => (
                              <tr key={`sub-${sub.id}`} className='border-t'>
                                <td className='p-2'>{sub.chatgpt_email}</td>
                                <td className='p-2'>
                                  <BusinessSubscriptionStatusBadge
                                    status={sub.status}
                                    t={t}
                                  />
                                </td>
                                <td className='p-2'>
                                  <ImportantTimestamp
                                    ts={sub.created_at}
                                    format={formatTs}
                                  />
                                </td>
                                <td className='text-muted-foreground p-2'>—</td>
                              </tr>
                            ))}
                            {tasks.map((task) => (
                              <tr key={`task-${task.id}`} className='border-t'>
                                <td className='p-2'>
                                  {task.chatgpt_email || '—'}
                                </td>
                                <td className='p-2'>
                                  <div className='flex flex-wrap gap-1'>
                                    <BusinessTaskTypeBadge
                                      taskType={task.task_type}
                                      t={t}
                                    />
                                    <BusinessTaskStatusBadge
                                      status={task.status}
                                      t={t}
                                    />
                                  </div>
                                </td>
                                <td className='p-2'>
                                  <ImportantTimestamp
                                    ts={task.created_at}
                                    format={formatTs}
                                  />
                                </td>
                                <td className='text-muted-foreground p-2'>
                                  {task.workspace_name} · {t('Seat Number')} #
                                  {task.seat_number || '—'}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {overviewDetail === 'cash_collected' && (
                  <div className='overflow-x-auto rounded-lg border'>
                    <table className='w-full min-w-[640px] text-sm'>
                      <thead className='bg-muted/50 text-left'>
                        <tr>
                          <th className='p-2'>{t('Order')}</th>
                          <th className='p-2'>{t('ChatGPT Email')}</th>
                          <th className='p-2'>{t('Amount')}</th>
                          <th className='p-2'>{t('Created At')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidOrders.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className='text-muted-foreground p-4'
                            >
                              {t('No paid orders yet')}
                            </td>
                          </tr>
                        ) : (
                          paidOrders.map((order) => (
                            <tr key={order.id} className='border-t'>
                              <td className='p-2'>{order.order_no}</td>
                              <td className='p-2'>
                                {maskEmail(order.chatgpt_email ?? '')}
                              </td>
                              <td className='p-2'>
                                {order.total_amount} {order.currency}
                              </td>
                              <td className='p-2'>
                                <ImportantTimestamp
                                  ts={order.created_at}
                                  format={formatTs}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value='workspaces' className='mt-4 space-y-4'>
            <div className='flex justify-end'>
              <Button onClick={() => setCreateOpen(true)}>
                {t('Create Workspace')}
              </Button>
            </div>
            {workspaces.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                {t('No workspaces yet')}
              </p>
            ) : (
              workspaces.map((ws) => (
                <Card key={ws.id}>
                  <CardHeader className='flex flex-row items-start justify-between gap-4'>
                    <div className='space-y-1'>
                      <CardTitle>{ws.name}</CardTitle>
                      {ws.subscription_description ? (
                        <p className='text-muted-foreground text-sm whitespace-pre-wrap'>
                          {ws.subscription_description}
                        </p>
                      ) : null}
                      <p className='text-muted-foreground text-sm'>
                        {formatWorkspaceSubscriptionSummaryFromWorkspace(
                          ws,
                          t,
                          formatTs
                        )}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {t('Status')}:{' '}
                        <BusinessSeatStatusBadge status={ws.status} t={t} /> ·{' '}
                        {t('Active Subscriptions')}:{' '}
                        {ws.active_subscriptions ?? 0}
                      </p>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => openEditWorkspace(ws)}
                      >
                        {t('Edit')}
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          setAddSeatWorkspaceId(ws.id)
                          setAddSeatOpen(true)
                        }}
                      >
                        {t('Add Standard Seats')}
                      </Button>
                      <Button
                        size='sm'
                        variant='destructive'
                        onClick={() => setDeleteWorkspaceTarget(ws)}
                      >
                        {t('Delete')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className='grid gap-2 text-sm md:grid-cols-3'>
                    <div>
                      {t('Billing Anchor')}:{' '}
                      <ImportantTimestamp
                        ts={ws.billing_anchor_at}
                        format={formatTs}
                        emphasis='warning'
                      />
                    </div>
                    <div>
                      {t('Timezone')}: {ws.billing_timezone}
                    </div>
                    <div>
                      {t('Grace Minutes')}: {ws.cycle_start_grace_minutes}
                    </div>
                    <div>
                      {t('Renewal lead time')}: {ws.renewal_lead_days ?? 3}{' '}
                      {t('days')}
                    </div>
                    <div>
                      {t('Total Seats')}:{' '}
                      {ws.pool?.total ?? ws.total_standard_seats}
                    </div>
                    <div>
                      {t('Active Seats')}: {ws.pool?.active ?? 0}
                    </div>
                    <div>
                      {t('Available Seats')}: {ws.pool?.available ?? 0}
                    </div>
                    <div>
                      {t('Active Subscriptions')}:{' '}
                      {ws.active_subscriptions ?? 0}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value='seats' className='mt-4 space-y-4'>
            {workspaces.length > 1 && (
              <div className='flex flex-wrap gap-2'>
                {workspaces.map((ws) => (
                  <Button
                    key={ws.id}
                    size='sm'
                    variant={
                      selectedWorkspace?.id === ws.id ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedWorkspaceId(ws.id)}
                  >
                    {ws.name}
                  </Button>
                ))}
              </div>
            )}
            <div className='flex items-center gap-2'>
              <Label htmlFor='seat-status-filter'>{t('Status')}</Label>
              <Select
                value={seatStatusFilter}
                onValueChange={(value) => value && setSeatStatusFilter(value)}
              >
                <SelectTrigger id='seat-status-filter' className='w-48'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>{t('All statuses')}</SelectItem>
                  {[
                    'AVAILABLE',
                    'RESERVED',
                    'INVITED',
                    'ACTIVE',
                    'PENDING_RELEASE',
                    'DISABLED',
                  ].map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`Business seat status.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='overflow-x-auto rounded-lg border'>
              <table className='w-full min-w-[720px] text-sm'>
                <thead className='bg-muted/50 text-left'>
                  <tr>
                    <th className='p-2'>{t('Seat Number')}</th>
                    <th className='p-2'>{t('Status')}</th>
                    <th className='p-2'>{t('User')}</th>
                    <th className='p-2'>{t('ChatGPT Email')}</th>
                    <th className='p-2'>{t('Subscription')}</th>
                    <th className='p-2'>{t('Activated At')}</th>
                    <th className='p-2'>{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map((seat) => (
                    <tr key={seat.id} className='border-t'>
                      <td className='p-2'>
                        #{String(seat.seat_number).padStart(3, '0')}
                      </td>
                      <td className='p-2'>
                        <BusinessSeatStatusBadge status={seat.status} t={t} />
                      </td>
                      <td className='p-2'>{seat.user_id ?? '—'}</td>
                      <td className='p-2'>{seat.assigned_email || '—'}</td>
                      <td className='p-2'>{seat.subscription_id ?? '—'}</td>
                      <td className='p-2'>
                        <ImportantTimestamp
                          ts={seat.activated_at}
                          format={formatTs}
                          emphasis={seat.activated_at ? 'default' : undefined}
                        />
                      </td>
                      <td className='p-2'>
                        <div className='flex flex-wrap gap-2'>
                          {seat.status === 'AVAILABLE' && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                void runAction(
                                  () => disableAdminBusinessSeat(seat.id),
                                  'Seat disabled'
                                )
                              }
                            >
                              {t('Disable')}
                            </Button>
                          )}
                          {seat.status === 'DISABLED' && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                void runAction(
                                  () => enableAdminBusinessSeat(seat.id),
                                  'Seat enabled'
                                )
                              }
                            >
                              {t('Enable')}
                            </Button>
                          )}
                          {seat.subscription_id &&
                            [
                              'ACTIVE',
                              'INVITED',
                              'RESERVED',
                              'PENDING_RELEASE',
                            ].includes(seat.status) && (
                              <Button
                                size='sm'
                                variant='destructive'
                                onClick={() => setRemoveSeatTarget(seat)}
                              >
                                {t('Remove')}
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value='tasks' className='mt-4 space-y-3'>
            {tasks.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                {t('No pending tasks')}
              </p>
            ) : (
              tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className='flex flex-wrap items-center justify-between gap-3 p-4 text-sm'>
                    <div className='space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <BusinessTaskTypeBadge
                          taskType={task.task_type}
                          t={t}
                        />
                        <BusinessTaskStatusBadge status={task.status} t={t} />
                      </div>
                      <div>
                        {task.workspace_name} · {t('Seat Number')} #
                        {task.seat_number || '—'}
                      </div>
                      <div>{task.chatgpt_email || '—'}</div>
                      <div>
                        <ImportantTimestamp
                          ts={task.created_at}
                          format={formatTs}
                          emphasis='warning'
                        />
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {task.chatgpt_email && (
                        <CopyButton
                          value={task.chatgpt_email}
                          size='sm'
                          variant='outline'
                          tooltip={t('Copy Email')}
                        >
                          {t('Copy Email')}
                        </CopyButton>
                      )}
                      {task.task_type === 'ADD_SEAT' &&
                        task.subscription_id && (
                          <Button
                            size='sm'
                            onClick={() =>
                              void runAction(
                                () =>
                                  confirmAdminSeatAdded(
                                    task.subscription_id ?? 0
                                  ),
                                'Seat added confirmed'
                              )
                            }
                          >
                            {t('Confirm Seat Added')}
                          </Button>
                        )}
                      {task.task_type === 'INVITE_MEMBER' &&
                        task.subscription_id && (
                          <Button
                            size='sm'
                            onClick={() =>
                              void runAction(
                                () =>
                                  markAdminBusinessInvited(
                                    task.subscription_id ?? 0
                                  ),
                                'Marked invited'
                              )
                            }
                          >
                            {t('Mark Invited')}
                          </Button>
                        )}
                      {task.task_type === 'CONFIRM_ACTIVATION' &&
                        task.subscription_id && (
                          <Button
                            size='sm'
                            onClick={() =>
                              void runAction(
                                () =>
                                  activateAdminBusinessSubscription(
                                    task.subscription_id ?? 0
                                  ),
                                'Activated'
                              )
                            }
                          >
                            {t('Activate')}
                          </Button>
                        )}
                      {task.task_type === 'REMOVE_MEMBER' &&
                        task.subscription_id && (
                          <Button
                            size='sm'
                            variant='destructive'
                            onClick={() =>
                              void runAction(
                                () =>
                                  confirmAdminRemoved(
                                    task.subscription_id ?? 0
                                  ),
                                'Marked removed'
                              )
                            }
                          >
                            {t('Mark Removed')}
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value='subscriptions' className='mt-4 space-y-3'>
            {subscriptions.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                {t('No subscriptions yet')}
              </p>
            ) : (
              subscriptions.map((sub) => {
                const order = orders.find((o) => o.id === sub.last_order_id)
                return (
                  <div
                    key={sub.id}
                    className='flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm'
                  >
                    <div>
                      <div>{sub.chatgpt_email}</div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <BusinessSubscriptionStatusBadge
                          status={sub.status}
                          t={t}
                        />
                        <span className='text-muted-foreground'>
                          {t('Paid Through')}:{' '}
                          <ImportantTimestamp
                            ts={sub.prepaid_through}
                            format={formatTs}
                            emphasis='warning'
                          />
                        </span>
                      </div>
                      {order && (
                        <div className='text-muted-foreground'>
                          {t('Order')}: {order.order_no} · {order.total_amount}{' '}
                          {order.currency}
                        </div>
                      )}
                    </div>
                    <div className='flex gap-2'>
                      {(sub.status === 'PENDING_ACTIVATION' ||
                        sub.status === 'INVITED') && (
                        <>
                          <CopyButton
                            value={sub.chatgpt_email}
                            size='sm'
                            variant='outline'
                            tooltip={t('Copy Email')}
                          >
                            {t('Copy Email')}
                          </CopyButton>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              void runAction(
                                () => markAdminBusinessInvited(sub.id),
                                'Marked invited'
                              )
                            }
                          >
                            {t('Mark Invited')}
                          </Button>
                          <Button
                            size='sm'
                            onClick={() =>
                              void runAction(
                                () => activateAdminBusinessSubscription(sub.id),
                                'Activated'
                              )
                            }
                          >
                            {t('Activate')}
                          </Button>
                        </>
                      )}
                      {sub.status === 'PENDING_CAPACITY' && (
                        <Button
                          size='sm'
                          onClick={() =>
                            void runAction(
                              () => confirmAdminSeatAdded(sub.id),
                              'Seat added confirmed'
                            )
                          }
                        >
                          {t('Confirm Seat Added')}
                        </Button>
                      )}
                      {sub.status === 'PENDING_REMOVAL' && (
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() =>
                            void runAction(
                              () => confirmAdminRemoved(sub.id),
                              'Marked removed'
                            )
                          }
                        >
                          {t('Mark Removed')}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </TabsContent>

          <TabsContent value='pricing' className='mt-4'>
            <Card>
              <CardHeader>
                <CardTitle>{t('Pricing')}</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2 md:col-span-2'>
                  <Label>{t('Workspace')}</Label>
                  <Select
                    value={
                      pricingWorkspaceId != null
                        ? String(pricingWorkspaceId)
                        : undefined
                    }
                    onValueChange={(value) => {
                      if (value) {
                        setPricingWorkspaceId(Number(value))
                      }
                    }}
                  >
                    <SelectTrigger className='w-full max-w-md'>
                      <span className='truncate'>
                        {pricingWorkspace?.name ?? t('Select workspace')}
                      </span>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {workspaces.map((ws) => (
                          <SelectItem key={ws.id} value={String(ws.id)}>
                            {ws.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {currentPrice ? (
                  <p className='text-muted-foreground text-sm md:col-span-2'>
                    {t('Current Price')}: {currentPrice.price_amount}{' '}
                    {currentPrice.currency} {currentPrice.display_unit}
                  </p>
                ) : (
                  <p className='text-muted-foreground text-sm md:col-span-2'>
                    {t('Pricing configuration required')}
                  </p>
                )}
                <div className='space-y-2 md:col-span-2'>
                  <p className='text-muted-foreground text-xs'>
                    {t('Pricing helper')}
                  </p>
                </div>
                <div className='space-y-2'>
                  <Label>{t('Amount')}</Label>
                  <p className='text-muted-foreground text-xs'>
                    {t('Price amount helper')}
                  </p>
                  <Input
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label>{t('Currency')}</Label>
                  <p className='text-muted-foreground text-xs'>
                    {t('Price currency helper')}
                  </p>
                  <Select
                    value={currency}
                    onValueChange={(value) => value && setCurrency(value)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {BUSINESS_PRICE_CURRENCIES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>{t('Billing')}</Label>
                  <p className='text-muted-foreground text-xs'>
                    {t('Billing cadence helper')}
                  </p>
                  <Select
                    value={billingCadence}
                    onValueChange={(value) => value && setBillingCadence(value)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {BUSINESS_BILLING_CADENCES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {t(getBillingCadenceLabelKey(item))}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label>{t('Display')}</Label>
                  <p className='text-muted-foreground text-xs'>
                    {t('Price display helper')}
                  </p>
                  <Input
                    value={displayUnit}
                    onChange={(e) => setDisplayUnit(e.target.value)}
                  />
                </div>
                <Button onClick={() => void savePrice()}>{t('Save')}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ConfirmDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={t('Create Workspace')}
          desc={t('Configure billing anchor and initial seat pool')}
          confirmText={t('Create')}
          handleConfirm={() => void createWorkspace()}
        >
          <div className='grid gap-3 py-2'>
            <WorkspaceNameField t={t} value={wsName} onChange={setWsName} />
            <WorkspaceSubscriptionDescriptionField
              t={t}
              value={wsDescription}
              onChange={setWsDescription}
            />
            <WorkspaceProviderField
              t={t}
              value={wsProvider}
              onChange={setWsProvider}
            />
            <WorkspaceBillingCadenceField
              t={t}
              value={wsCadence}
              onChange={setWsCadence}
            />
            <WorkspaceBillingAnchorField
              t={t}
              value={wsAnchor}
              onChange={setWsAnchor}
            />
            <WorkspaceTimezoneField
              t={t}
              value={wsTimezone}
              onChange={setWsTimezone}
            />
            <WorkspaceSeatCountField
              t={t}
              value={wsSeats}
              onChange={setWsSeats}
            />
            <WorkspaceGraceMinutesField
              t={t}
              value={wsGrace}
              onChange={setWsGrace}
            />
            <WorkspaceRenewalLeadDaysField
              t={t}
              value={wsRenewalLead}
              onChange={setWsRenewalLead}
            />
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title={t('Edit Workspace')}
          desc={
            (editWorkspace?.active_subscriptions ?? 0) > 0
              ? t('Billing anchor is locked while active subscriptions exist')
              : t('Update safe workspace fields')
          }
          confirmText={t('Save')}
          handleConfirm={() => void saveWorkspaceEdit()}
        >
          <div className='grid gap-3 py-2'>
            <WorkspaceNameField t={t} value={editName} onChange={setEditName} />
            <WorkspaceSubscriptionDescriptionField
              t={t}
              value={editDescription}
              onChange={setEditDescription}
            />
            <WorkspaceBillingAnchorField
              t={t}
              value={editAnchor}
              onChange={setEditAnchor}
              disabled={(editWorkspace?.active_subscriptions ?? 0) > 0}
            />
            <WorkspaceTimezoneField
              t={t}
              value={editTimezone}
              onChange={setEditTimezone}
            />
            <WorkspaceGraceMinutesField
              t={t}
              value={editGrace}
              onChange={setEditGrace}
            />
            <WorkspaceRenewalLeadDaysField
              t={t}
              value={editRenewalLead}
              onChange={setEditRenewalLead}
            />
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={deleteWorkspaceTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteWorkspaceTarget(null)
          }}
          title={t('Delete Workspace?')}
          desc={t(
            'This retires the workspace and removes it from ChatGPT subscriptions. Workspaces with active subscriptions cannot be deleted.'
          )}
          confirmText={t('Delete')}
          destructive
          handleConfirm={() => void deleteWorkspace()}
        />

        <ConfirmDialog
          open={removeSeatTarget != null}
          onOpenChange={(open) => {
            if (!open) setRemoveSeatTarget(null)
          }}
          title={t('Remove seat assignment?')}
          desc={t(
            'This starts removal for the assigned member and releases the seat after confirmation.'
          )}
          confirmText={t('Remove')}
          destructive
          handleConfirm={() => void confirmRemoveSeat()}
        />

        <ConfirmDialog
          open={addSeatOpen}
          onOpenChange={(open) => {
            setAddSeatOpen(open)
            if (!open) setAddSeatConfirmed(false)
          }}
          title={t('Add Standard Seats')}
          desc={t(
            'Increase local seat pool after adding seats in the official workspace'
          )}
          confirmText={t('Confirm')}
          disabled={!addSeatConfirmed}
          handleConfirm={() => void confirmAddSeats()}
        >
          <div className='grid gap-3 py-2'>
            {selectedWorkspace && (
              <p className='text-muted-foreground text-sm'>
                {t('Current Seat Count')}:{' '}
                {selectedWorkspace.pool?.total ??
                  selectedWorkspace.total_standard_seats}
              </p>
            )}
            <div className='space-y-2'>
              <Label>{t('Add Quantity')}</Label>
              <Input
                value={addSeatCount}
                onChange={(e) => setAddSeatCount(e.target.value)}
              />
            </div>
            {selectedWorkspace && (
              <p className='text-sm'>
                {t('New Total')}:{' '}
                {(selectedWorkspace.pool?.total ??
                  selectedWorkspace.total_standard_seats) +
                  (Number(addSeatCount) || 0)}
              </p>
            )}
            <label className='flex items-start gap-2 text-sm'>
              <Checkbox
                checked={addSeatConfirmed}
                onCheckedChange={(v) => setAddSeatConfirmed(v === true)}
              />
              <span>
                {t(
                  'I confirm that the corresponding seat(s) have already been added in the official Workspace.'
                )}
              </span>
            </label>
          </div>
        </ConfirmDialog>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
