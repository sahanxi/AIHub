import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import { DateTimePicker } from '@/components/datetime-picker'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dayjs from '@/lib/dayjs'

import {
  activateAdminBusinessSubscription,
  addAdminBusinessSeats,
  confirmAdminRemoved,
  confirmAdminSeatAdded,
  createAdminBusinessPrice,
  createAdminBusinessWorkspace,
  disableAdminBusinessSeat,
  getAdminBusinessOrders,
  getAdminBusinessOverview,
  getAdminBusinessPricing,
  getAdminBusinessSeats,
  getAdminBusinessSubscriptions,
  getAdminBusinessTasks,
  getAdminBusinessWorkspaces,
  isApiSuccess,
  markAdminBusinessInvited,
  updateAdminBusinessWorkspace,
} from '../api'
import type {
  BusinessPriceVersion,
  BusinessSeat,
  BusinessSeatOrder,
  BusinessSeatTask,
  BusinessSubscription,
  BusinessWorkspace,
} from '../types'

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  return dayjs.unix(ts).format('YYYY-MM-DD HH:mm')
}

function StatusBadge(props: { status: string }) {
  const variant =
    props.status === 'ACTIVE' || props.status === 'COMPLETED'
      ? 'default'
      : props.status === 'PENDING' || props.status.includes('PENDING')
        ? 'secondary'
        : 'outline'
  return <Badge variant={variant}>{props.status}</Badge>
}

export function ChatGPTBusinessAdminPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null)
  const [workspaces, setWorkspaces] = useState<BusinessWorkspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null)
  const [seats, setSeats] = useState<BusinessSeat[]>([])
  const [tasks, setTasks] = useState<BusinessSeatTask[]>([])
  const [subscriptions, setSubscriptions] = useState<BusinessSubscription[]>([])
  const [orders, setOrders] = useState<BusinessSeatOrder[]>([])
  const [currentPrice, setCurrentPrice] = useState<BusinessPriceVersion | null>(null)
  const [priceAmount, setPriceAmount] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [billingCadence, setBillingCadence] = useState('MONTHLY')
  const [displayUnit, setDisplayUnit] = useState('/ month')

  const [createOpen, setCreateOpen] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wsProvider, setWsProvider] = useState('OPENAI')
  const [wsCadence, setWsCadence] = useState('MONTHLY')
  const [wsAnchor, setWsAnchor] = useState<Date | undefined>()
  const [wsTimezone, setWsTimezone] = useState('Asia/Shanghai')
  const [wsSeats, setWsSeats] = useState('3')
  const [wsGrace, setWsGrace] = useState('60')

  const [addSeatOpen, setAddSeatOpen] = useState(false)
  const [addSeatCount, setAddSeatCount] = useState('1')
  const [addSeatConfirmed, setAddSeatConfirmed] = useState(false)
  const [addSeatWorkspaceId, setAddSeatWorkspaceId] = useState<number | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editWorkspace, setEditWorkspace] = useState<BusinessWorkspace | null>(null)
  const [editName, setEditName] = useState('')
  const [editTimezone, setEditTimezone] = useState('')
  const [editGrace, setEditGrace] = useState('')
  const [editAnchor, setEditAnchor] = useState<Date | undefined>()

  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.id === selectedWorkspaceId) ?? workspaces[0] ?? null,
    [workspaces, selectedWorkspaceId],
  )

  const loadCore = useCallback(async () => {
    const [overviewRes, wsRes, subsRes, ordersRes, pricingRes, tasksRes] = await Promise.all([
      getAdminBusinessOverview(),
      getAdminBusinessWorkspaces(),
      getAdminBusinessSubscriptions(),
      getAdminBusinessOrders(),
      getAdminBusinessPricing(),
      getAdminBusinessTasks(),
    ])
    if (isApiSuccess(overviewRes)) setOverview(overviewRes.data)
    if (isApiSuccess(wsRes)) {
      setWorkspaces(wsRes.data)
      if (wsRes.data.length > 0 && selectedWorkspaceId == null) {
        setSelectedWorkspaceId(wsRes.data[0].id)
      }
    }
    if (isApiSuccess(subsRes)) setSubscriptions(subsRes.data.items)
    if (isApiSuccess(ordersRes)) setOrders(ordersRes.data.items)
    if (isApiSuccess(pricingRes)) setCurrentPrice(pricingRes.data.current)
    if (isApiSuccess(tasksRes)) setTasks(tasksRes.data)
  }, [selectedWorkspaceId])

  const loadSeats = useCallback(async (workspaceId: number) => {
    const res = await getAdminBusinessSeats(workspaceId)
    if (isApiSuccess(res)) setSeats(res.data.seats)
  }, [])

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
      void loadSeats(selectedWorkspace.id)
    }
  }, [selectedWorkspace?.id, loadSeats])

  const refresh = async () => {
    await loadCore()
    if (selectedWorkspace?.id) await loadSeats(selectedWorkspace.id)
  }

  const savePrice = async () => {
    const res = await createAdminBusinessPrice({
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
      provider: wsProvider,
      billing_cadence: wsCadence,
      billing_anchor_at: Math.floor(wsAnchor.getTime() / 1000),
      billing_timezone: wsTimezone,
      cycle_start_grace_minutes: Number(wsGrace) || 60,
      total_standard_seats: Number(wsSeats) || 1,
    })
    if (isApiSuccess(res)) {
      toast.success(t('Workspace created'))
      setCreateOpen(false)
      setWsName('')
      void refresh()
    } else {
      toast.error(res.message || t('Unable to create workspace'))
    }
  }

  const openEditWorkspace = (ws: BusinessWorkspace) => {
    setEditWorkspace(ws)
    setEditName(ws.name)
    setEditTimezone(ws.billing_timezone)
    setEditGrace(String(ws.cycle_start_grace_minutes))
    setEditAnchor(new Date(ws.billing_anchor_at * 1000))
    setEditOpen(true)
  }

  const saveWorkspaceEdit = async () => {
    if (!editWorkspace) return
    const body: {
      name?: string
      billing_timezone?: string
      cycle_start_grace_minutes?: number
      billing_anchor_at?: number
    } = {
      name: editName.trim(),
      billing_timezone: editTimezone.trim(),
      cycle_start_grace_minutes: Number(editGrace) || editWorkspace.cycle_start_grace_minutes,
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
    okMsg: string,
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

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('ChatGPT Business')}</h1>
          <p className="text-sm text-muted-foreground">{t('Manage workspaces, pricing, and activations')}</p>
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="max-w-full flex-wrap justify-start">
            <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
            <TabsTrigger value="workspaces">{t('Workspaces')}</TabsTrigger>
            <TabsTrigger value="seats">{t('Seat Pool')}</TabsTrigger>
            <TabsTrigger value="tasks">{t('Tasks')}</TabsTrigger>
            <TabsTrigger value="subscriptions">{t('Subscriptions')}</TabsTrigger>
            <TabsTrigger value="pricing">{t('Pricing')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('Active Users')}</CardTitle>
                </CardHeader>
                <CardContent>{String(overview?.active_users ?? 0)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('Available Seats')}</CardTitle>
                </CardHeader>
                <CardContent>{String(pool?.available_seats ?? 0)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('Pending Activation')}</CardTitle>
                </CardHeader>
                <CardContent>{String(overview?.pending_activation ?? 0)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('Cash Collected')}</CardTitle>
                </CardHeader>
                <CardContent>{String(overview?.cash_collected ?? 0)}</CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workspaces" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCreateOpen(true)}>{t('Create Workspace')}</Button>
            </div>
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No workspaces yet')}</p>
            ) : (
              workspaces.map((ws) => (
                <Card key={ws.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>{ws.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {ws.provider} · {ws.status} · {ws.billing_cadence}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditWorkspace(ws)}>
                        {t('Edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddSeatWorkspaceId(ws.id)
                          setAddSeatOpen(true)
                        }}
                      >
                        {t('Add Standard Seats')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm md:grid-cols-3">
                    <div>
                      {t('Billing Anchor')}: {formatTs(ws.billing_anchor_at)}
                    </div>
                    <div>
                      {t('Timezone')}: {ws.billing_timezone}
                    </div>
                    <div>
                      {t('Grace Minutes')}: {ws.cycle_start_grace_minutes}
                    </div>
                    <div>
                      {t('Total Seats')}: {ws.pool?.total ?? ws.total_standard_seats}
                    </div>
                    <div>
                      {t('Active Seats')}: {ws.pool?.active ?? 0}
                    </div>
                    <div>
                      {t('Available Seats')}: {ws.pool?.available ?? 0}
                    </div>
                    <div>
                      {t('Active Subscriptions')}: {ws.active_subscriptions ?? 0}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="seats" className="mt-4 space-y-4">
            {workspaces.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {workspaces.map((ws) => (
                  <Button
                    key={ws.id}
                    size="sm"
                    variant={selectedWorkspace?.id === ws.id ? 'default' : 'outline'}
                    onClick={() => setSelectedWorkspaceId(ws.id)}
                  >
                    {ws.name}
                  </Button>
                ))}
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2">{t('Seat Number')}</th>
                    <th className="p-2">{t('Status')}</th>
                    <th className="p-2">{t('User')}</th>
                    <th className="p-2">{t('ChatGPT Email')}</th>
                    <th className="p-2">{t('Subscription')}</th>
                    <th className="p-2">{t('Activated At')}</th>
                    <th className="p-2">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map((seat) => (
                    <tr key={seat.id} className="border-t">
                      <td className="p-2">#{String(seat.seat_number).padStart(3, '0')}</td>
                      <td className="p-2">
                        <StatusBadge status={seat.status} />
                      </td>
                      <td className="p-2">{seat.user_id ?? '—'}</td>
                      <td className="p-2">{seat.assigned_email || '—'}</td>
                      <td className="p-2">{seat.subscription_id ?? '—'}</td>
                      <td className="p-2">{formatTs(seat.activated_at)}</td>
                      <td className="p-2">
                        {seat.status === 'AVAILABLE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(
                                () => disableAdminBusinessSeat(seat.id),
                                'Seat disabled',
                              )
                            }
                          >
                            {t('Disable')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No pending tasks')}</p>
            ) : (
              tasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={task.task_type} />
                        <StatusBadge status={task.status} />
                      </div>
                      <div>
                        {task.workspace_name} · {t('Seat Number')} #{task.seat_number || '—'}
                      </div>
                      <div>{task.chatgpt_email || '—'}</div>
                      <div className="text-muted-foreground">{formatTs(task.created_at)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {task.chatgpt_email && (
                        <CopyButton value={task.chatgpt_email} size="sm" variant="outline" tooltip={t('Copy Email')}>
                          {t('Copy Email')}
                        </CopyButton>
                      )}
                      {task.task_type === 'ADD_SEAT' && task.subscription_id && (
                        <Button
                          size="sm"
                          onClick={() =>
                            void runAction(
                              () => confirmAdminSeatAdded(task.subscription_id!),
                              'Seat added confirmed',
                            )
                          }
                        >
                          {t('Confirm Seat Added')}
                        </Button>
                      )}
                      {task.task_type === 'INVITE_MEMBER' && task.subscription_id && (
                        <Button
                          size="sm"
                          onClick={() =>
                            void runAction(
                              () => markAdminBusinessInvited(task.subscription_id!),
                              'Marked invited',
                            )
                          }
                        >
                          {t('Mark Invited')}
                        </Button>
                      )}
                      {task.task_type === 'CONFIRM_ACTIVATION' && task.subscription_id && (
                        <Button
                          size="sm"
                          onClick={() =>
                            void runAction(
                              () => activateAdminBusinessSubscription(task.subscription_id!),
                              'Activated',
                            )
                          }
                        >
                          {t('Activate')}
                        </Button>
                      )}
                      {task.task_type === 'REMOVE_MEMBER' && task.subscription_id && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void runAction(
                              () => confirmAdminRemoved(task.subscription_id!),
                              'Marked removed',
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

          <TabsContent value="subscriptions" className="mt-4 space-y-3">
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No subscriptions yet')}</p>
            ) : (
              subscriptions.map((sub) => {
                const order = orders.find((o) => o.id === sub.last_order_id)
                return (
                  <div
                    key={sub.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <div>{sub.chatgpt_email}</div>
                      <div className="text-muted-foreground">
                        <StatusBadge status={sub.status} /> · {t('Paid Through')}:{' '}
                        {formatTs(sub.prepaid_through)}
                      </div>
                      {order && (
                        <div className="text-muted-foreground">
                          {t('Order')}: {order.order_no} · {order.total_amount} {order.currency}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(sub.status === 'PENDING_ACTIVATION' || sub.status === 'INVITED') && (
                        <>
                          <CopyButton value={sub.chatgpt_email} size="sm" variant="outline" tooltip={t('Copy Email')}>
                            {t('Copy Email')}
                          </CopyButton>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(() => markAdminBusinessInvited(sub.id), 'Marked invited')
                            }
                          >
                            {t('Mark Invited')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              void runAction(
                                () => activateAdminBusinessSubscription(sub.id),
                                'Activated',
                              )
                            }
                          >
                            {t('Activate')}
                          </Button>
                        </>
                      )}
                      {sub.status === 'PENDING_CAPACITY' && (
                        <Button
                          size="sm"
                          onClick={() =>
                            void runAction(() => confirmAdminSeatAdded(sub.id), 'Seat added confirmed')
                          }
                        >
                          {t('Confirm Seat Added')}
                        </Button>
                      )}
                      {sub.status === 'PENDING_REMOVAL' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void runAction(() => confirmAdminRemoved(sub.id), 'Marked removed')
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

          <TabsContent value="pricing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Pricing')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {currentPrice ? (
                  <p className="text-sm text-muted-foreground md:col-span-2">
                    {t('Current Price')}: {currentPrice.price_amount} {currentPrice.currency}{' '}
                    {currentPrice.display_unit}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground md:col-span-2">
                    {t('Pricing configuration required')}
                  </p>
                )}
                <div className="space-y-2">
                  <Label>{t('Amount')}</Label>
                  <Input value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Currency')}</Label>
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Billing')}</Label>
                  <Input value={billingCadence} onChange={(e) => setBillingCadence(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Display')}</Label>
                  <Input value={displayUnit} onChange={(e) => setDisplayUnit(e.target.value)} />
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
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>{t('Workspace Name')}</Label>
              <Input value={wsName} onChange={(e) => setWsName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Provider')}</Label>
              <Input value={wsProvider} onChange={(e) => setWsProvider(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Billing')}</Label>
              <Input value={wsCadence} onChange={(e) => setWsCadence(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Billing Anchor')}</Label>
              <DateTimePicker value={wsAnchor} onChange={setWsAnchor} />
            </div>
            <div className="space-y-2">
              <Label>{t('Timezone')}</Label>
              <Input value={wsTimezone} onChange={(e) => setWsTimezone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Seat Count')}</Label>
              <Input value={wsSeats} onChange={(e) => setWsSeats(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Grace Minutes')}</Label>
              <Input value={wsGrace} onChange={(e) => setWsGrace(e.target.value)} />
            </div>
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
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>{t('Workspace Name')}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Billing Anchor')}</Label>
              <DateTimePicker
                value={editAnchor}
                onChange={setEditAnchor}
                className={(editWorkspace?.active_subscriptions ?? 0) > 0 ? 'pointer-events-none opacity-50' : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Timezone')}</Label>
              <Input value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Grace Minutes')}</Label>
              <Input value={editGrace} onChange={(e) => setEditGrace(e.target.value)} />
            </div>
          </div>
        </ConfirmDialog>

        <ConfirmDialog
          open={addSeatOpen}
          onOpenChange={(open) => {
            setAddSeatOpen(open)
            if (!open) setAddSeatConfirmed(false)
          }}
          title={t('Add Standard Seats')}
          desc={t('Increase local seat pool after adding seats in the official workspace')}
          confirmText={t('Confirm')}
          disabled={!addSeatConfirmed}
          handleConfirm={() => void confirmAddSeats()}
        >
          <div className="grid gap-3 py-2">
            {selectedWorkspace && (
              <p className="text-sm text-muted-foreground">
                {t('Current Seat Count')}: {selectedWorkspace.pool?.total ?? selectedWorkspace.total_standard_seats}
              </p>
            )}
            <div className="space-y-2">
              <Label>{t('Add Quantity')}</Label>
              <Input value={addSeatCount} onChange={(e) => setAddSeatCount(e.target.value)} />
            </div>
            {selectedWorkspace && (
              <p className="text-sm">
                {t('New Total')}:{' '}
                {(selectedWorkspace.pool?.total ?? selectedWorkspace.total_standard_seats) +
                  (Number(addSeatCount) || 0)}
              </p>
            )}
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={addSeatConfirmed} onCheckedChange={(v) => setAddSeatConfirmed(v === true)} />
              <span>
                {t('I confirm that the corresponding seat(s) have already been added in the official Workspace.')}
              </span>
            </label>
          </div>
        </ConfirmDialog>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
