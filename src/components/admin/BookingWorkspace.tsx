'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUpCircle, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Coins, Copy, FileText, History, Info, Landmark, MoreHorizontal, Phone, Plus, ReceiptText, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatBookingDate } from '@/lib/utils'
import { ceremonies } from '@/lib/celebrations'
import { subscribeToBookingUpdates } from '@/lib/admin/booking-updates'
import { BookingAmountHistory } from './BookingAmountHistory'
import { AdditionalQuotationLinker } from './AdditionalQuotationLinker'
import { CustomerPayments } from './CustomerPayments'
import { ExpenseTracking } from './ExpenseTracking'
import { EventPlanning } from './EventPlanning'
import { VendorCoordination } from './VendorCoordination'
import { BookingDeletion } from './BookingDeletion'
import { BookingDialogContent } from './BookingDialog'
import { BookingStatus, BookingServices, BookingLeads, BookingActivityList } from './BookingDetail'
import { BookingCard, BookingBadge, BookingProgress, BookingViewLink } from './BookingWorkspaceUI'
import { BookingWorkspaceHistory } from './BookingWorkspaceHistory'
import { bookingQueryKey, bookingMoney, useBookingData, useBookingResource, useBookingSummary, type WorkspaceTask, type WorkspaceAssignment } from './booking-workspace-data'
import styles from './BookingWorkspace.module.css'
import theme from './BookingTheme.module.css'

const tabs = [
  ['overview', 'Overview', ReceiptText], ['services', 'Services & Quotations', FileText],
  ['payments', 'Payments & Expenses', Wallet], ['planning', 'Event Planning', CalendarDays],
  ['vendors', 'Vendors', Users], ['history', 'Activity History', History],
] as const
type Tab = typeof tabs[number][0]
type Action = 'payment' | 'expense' | 'task' | 'vendor'

function ResourceMessage({ loading, error, retry, children }: { loading: boolean; error: Error | null; retry: () => void; children: ReactNode }) {
  return <>{error && <div role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error.message} <button type="button" className="font-semibold underline" onClick={retry}>Retry</button></div>}{loading ? <p role="status" className="py-4 text-sm text-slate-500">Loading…</p> : children}</>
}

export function BookingWorkspace({ id }: { id: string }) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams()
  const selected = params.get('tab')
  const tab: Tab = tabs.some(([key]) => key === selected) ? selected as Tab : 'overview'
  const queryClient = useQueryClient()
  const detail = useBookingData(id), payment = useBookingSummary(id)
  const expenses = useBookingResource<{ summary: { expenses_recorded: number; available_to_allocate: number } }>(id, 'expenses')
  const tasks = useBookingResource<{ tasks: WorkspaceTask[] }>(id, 'tasks')
  const vendors = useBookingResource<{ assignments: WorkspaceAssignment[] }>(id, 'vendors')
  const [action, setAction] = useState<Action | null>(null)
  const consumeAction = useCallback(() => setAction(null), [])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusPanel = useRef(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => subscribeToBookingUpdates(id, () => { void queryClient.invalidateQueries({ queryKey: bookingQueryKey(id) }) }), [id, queryClient])
  function navigate(next: Tab, requestedAction?: Action, moveFocus = true) {
    focusPanel.current = moveFocus && !requestedAction
    setAction(requestedAction ?? null)
    const query = new URLSearchParams(params.toString())
    if (next === 'overview') query.delete('tab'); else query.set('tab', next)
    router.push(`${pathname}${query.size ? `?${query}` : ''}`, { scroll: false })
  }
  useEffect(() => {
    if (focusPanel.current && !action) { panelRef.current?.focus({ preventScroll: true }); focusPanel.current = false }
  }, [tab, action])
  if (!detail.data) return <div className={`${styles.workspace} ${theme.surface}`}><div className={styles.content}><Link href="/admin/bookings" className={styles.textLink}><ArrowLeft className="size-4" />Back to bookings</Link>{detail.error ? <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-white p-6"><p>{detail.error.message}</p><Button variant="outline" className="mt-3" onClick={() => void detail.refetch()}>Retry booking</Button></div> : <div role="status" aria-label="Loading booking" className="mt-6 space-y-4"><div className={styles.skeleton} /><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className={`${styles.skeleton} !h-64`} />)}</div><span className="sr-only">Loading booking…</span></div>}</div></div>
  const { booking, activities } = detail.data
  const summary = payment.data?.summary
  const total = summary ? Number(summary.booking_total) : Number(booking.quoted_total)
  const received = summary ? Number(summary.net_received) : 0
  const percentage = total > 0 ? received * 100 / total : 0
  const activeTasks = tasks.data?.tasks.filter(task => task.status !== 'cancelled') ?? []
  const completedTasks = activeTasks.filter(task => task.status === 'completed').length
  const taskPercent = activeTasks.length ? completedTasks * 100 / activeTasks.length : 0
  const canPlan = ['confirmed', 'planning', 'ready'].includes(booking.status)
  const ceremony = ceremonies.find(item => item.slug === booking.ceremony_type || `${item.years}th` === booking.ceremony_type)
  const ceremonyName = ceremony ? `${ceremony.title} Celebration (${ceremony.traditionalName})` : booking.ceremony_type || 'Ceremony not specified'
  const contact = booking.customer_contact && /^\+?[\d\s()-]{7,}$/.test(booking.customer_contact) ? booking.customer_contact.replace(/[^+\d]/g, '') : undefined
  const whatsapp = contact?.replace(/^\+/, '').replace(/^(\d{10})$/, '91$1')
  async function copyReference() {
    try { await navigator.clipboard.writeText(booking.booking_reference); setCopied(true); toast.success('Booking reference copied') }
    catch { toast.error('Unable to copy booking reference') }
  }
  return <div className={`${styles.workspace} ${theme.surface}`}><div className={styles.content}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Link href="/admin/bookings" className="inline-flex items-center gap-2 hover:text-violet-700"><ArrowLeft className="size-4" />Bookings</Link><ChevronRight className="size-3" /><span className="font-medium text-slate-700">{booking.booking_reference}</span></nav><h1 className="text-2xl font-bold tracking-tight">Booking Details</h1></div><span className="rounded-full border border-violet-100 bg-white/70 px-3 py-1 text-xs text-violet-700">Celebration workspace</span></div>
    {detail.error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Unable to refresh booking: {detail.error.message}</p>}
    <section aria-label="Booking summary" className={styles.card}>
      <div className="flex flex-col justify-between gap-5 2xl:flex-row">
        <div className="flex-1"><div className="flex items-start gap-4"><div className="hidden size-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-violet-100 sm:flex"><Image src="/brand/emoji/temple.png" alt="" width={76} height={76} className="object-contain" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold tracking-tight">{booking.customer_name || 'Booking without a primary lead'}</h2><BookingBadge status={booking.status} /></div><p className="mt-1 text-sm text-slate-600">{ceremonyName}</p><button type="button" aria-label="Copy booking reference" onClick={() => void copyReference()} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs font-medium"><span className="truncate">{booking.booking_reference}</span>{copied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}</button></div></div>
          <dl className="mt-4 grid gap-4 border-t border-violet-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
            <HeaderField icon={CalendarDays} label="Event Date"><span className="font-semibold">{booking.event_date ? formatBookingDate(booking.event_date) : 'Date not specified'}</span></HeaderField>
            <HeaderField icon={Phone} label="Customer Contact"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{booking.customer_contact || '—'}</span>{contact && <><a href={`tel:${contact}`} aria-label="Call customer" className="rounded bg-emerald-50 p-1 text-emerald-700"><Phone className="size-3.5" /></a><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="Message customer on WhatsApp" className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-bold text-emerald-700">WA</a></>}</div></HeaderField>
            <HeaderField icon={FileText} label="Quotation">{booking.quotations ? <Link className="break-all text-xs font-semibold text-violet-700 underline underline-offset-2" href={`/admin/quotations/${booking.quotation_id}/edit`}>{booking.quotations.quotation_number}</Link> : '—'}</HeaderField>
            <HeaderField icon={Coins} label="Booking Total"><span className="font-semibold">{bookingMoney(total)}</span></HeaderField>
          </dl>
        </div>
        <div className="flex flex-col gap-4 2xl:w-80 2xl:shrink-0"><div className="flex flex-wrap gap-2 2xl:justify-end"><Button size="sm" variant="outline" asChild><Link href={`/admin/quotations/${booking.quotation_id}/edit`}><FileText className="size-4" />View Quotation</Link></Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="sm" className="bg-violet-700 hover:bg-violet-800"><MoreHorizontal className="size-4" />More Actions<ChevronDown className="size-3" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className={theme.menu}><DropdownMenuItem onSelect={() => navigate('services')}>Manage services &amp; quotations</DropdownMenuItem><DropdownMenuItem onSelect={() => navigate('payments')}>Manage payments &amp; expenses</DropdownMenuItem><DropdownMenuItem onSelect={() => navigate('history')}>View activity history</DropdownMenuItem>{['pending_confirmation', 'cancelled'].includes(booking.status) && <DropdownMenuItem data-destructive="true" className="text-rose-700" onSelect={() => setDeleteOpen(true)}>Delete booking</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4"><div className="mb-2 flex flex-wrap items-center gap-3"><h3 className="text-sm font-semibold">Payment Status</h3>{summary && <BookingBadge status={summary.payment_status} />}</div><ResourceMessage loading={payment.isPending} error={payment.error} retry={() => void payment.refetch()}>{summary && <><p className="mb-2 text-xs text-slate-600">{bookingMoney(received)} received of {bookingMoney(total)}</p><div className="flex items-center gap-3"><div className="flex-1"><BookingProgress value={percentage} label="Payment collection" /></div><span className="text-xs font-medium">{Math.round(percentage)}%</span></div></>}</ResourceMessage></div>
        </div>
      </div>
    </section>
    <Tabs value={tab} onValueChange={value => navigate(value as Tab, undefined, false)}>
      <div className={styles.tabScroll}><TabsList aria-label="Booking sections" className={styles.tabs}>{tabs.map(([key, label, Icon]) => <TabsTrigger key={key} value={key} className={styles.tab}><Icon className="size-4" aria-hidden="true" />{label}</TabsTrigger>)}</TabsList></div>
      <div ref={panelRef} tabIndex={-1} className={styles.panel}>
        <TabsContent value="overview" className="mt-0">
          <div className={styles.grid}>
            <div className={styles.financial}><BookingCard title="Financial Overview" icon={BarChart3}>
              <ResourceMessage loading={payment.isPending || expenses.isPending} error={payment.error || expenses.error} retry={() => { void payment.refetch(); void expenses.refetch() }}>{summary && expenses.data && <>
                <dl className={styles.metricGrid}>{[
                  { label: 'Booking Total', value: total, icon: Landmark, tone: 'violet' },
                  { label: 'Net Received', value: received, icon: ArrowDown, tone: 'green' },
                  { label: 'Outstanding', value: summary.outstanding_balance, icon: ArrowUpCircle, tone: 'red' },
                  { label: 'Expenses Recorded', value: expenses.data.summary.expenses_recorded, icon: ReceiptText, tone: 'blue' },
                ].map(metric => <div key={metric.label} className={styles.metric} data-tone={metric.tone}><span className={styles.icon}><metric.icon aria-hidden="true" /></span><div><dt>{metric.label}</dt><dd className={metric.label === 'Outstanding' && Number(metric.value) > 0 ? 'text-rose-700' : ''}>{bookingMoney(metric.value)}</dd></div></div>)}</dl>
                <div className="mt-5 border-t border-violet-100 pt-4"><h3 className="text-sm font-semibold">Payment Collection</h3><div className="my-2 flex flex-wrap justify-between gap-2 text-xs"><span>{Math.round(percentage)}% collected</span><span>{bookingMoney(received)} / {bookingMoney(total)}</span></div><BookingProgress value={percentage} label="Booking payment collection" /></div>
                <dl className="my-4 flex flex-wrap justify-between gap-2 border-t border-violet-100 pt-3 text-sm"><dt className="flex items-center gap-2 text-slate-600">Available to Allocate<span title="Net customer receipts minus recorded expenses"><Info className="size-3.5" aria-label="Net customer receipts minus recorded expenses" /></span></dt><dd className="font-bold">{bookingMoney(expenses.data.summary.available_to_allocate)}</dd></dl>
              </>}</ResourceMessage>
              <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button size="sm" className="bg-violet-700 hover:bg-violet-800" onClick={() => navigate('payments', 'payment')}><Plus className="size-4" />Record Payment</Button><Button size="sm" variant="outline" className="border-violet-300 text-violet-700" disabled={!expenses.data || Number(expenses.data.summary.available_to_allocate) <= 0} onClick={() => navigate('payments', 'expense')}><Plus className="size-4" />Record Expense</Button></div>
            </BookingCard></div>
            <div className={styles.status}><BookingStatus id={id} /></div>
            <div className={styles.planning}><BookingCard title="Event Planning" icon={CalendarDays} action={<Button size="sm" variant="outline" className="text-xs text-violet-700" disabled={!canPlan} onClick={() => navigate('planning', 'task')}>Create Task</Button>}>
              <ResourceMessage loading={tasks.isPending} error={tasks.error} retry={() => void tasks.refetch()}>{tasks.data && <><div className="mb-2 flex items-center justify-between text-xs"><span><strong className="text-base text-emerald-600">{completedTasks} / {activeTasks.length}</strong> tasks completed</span><span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{Math.round(taskPercent)}%</span></div><BookingProgress value={taskPercent} label="Event planning progress" /><ul className="mt-4 divide-y divide-violet-100">{activeTasks.slice(0, 2).map(task => <li key={task.id} className="flex items-start gap-3 py-3 text-sm"><CheckCircle2 className={`mt-0.5 size-5 shrink-0 ${task.status === 'completed' ? 'text-emerald-500' : 'text-violet-300'}`} /><div className="flex-1"><p className="font-semibold">{task.title}</p><p className="mt-0.5 text-xs text-slate-500">{task.admins?.email || 'Unassigned'}</p></div><BookingBadge status={task.status} /></li>)}</ul>{!activeTasks.length && <p className="py-5 text-sm text-slate-500">No active tasks yet.</p>}</>}</ResourceMessage><div className="mt-2 flex justify-end border-t border-violet-100 pt-3"><BookingViewLink onClick={() => navigate('planning')}>View All Tasks</BookingViewLink></div>
            </BookingCard></div>
            <div className={styles.vendors}><BookingCard title="Vendor Coordination" icon={Users} action={<Button size="sm" variant="outline" disabled={!canPlan} className="text-xs text-violet-700" onClick={() => navigate('vendors', 'vendor')}>Create Assignment</Button>}>
              <ResourceMessage loading={vendors.isPending} error={vendors.error} retry={() => void vendors.refetch()}>{vendors.data?.assignments.length ? <ul className="space-y-2">{vendors.data.assignments.slice(0, 2).map(assignment => <li key={assignment.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-100 p-3"><span className={styles.icon}><Landmark aria-hidden="true" /></span><div className="flex-1 text-sm"><p className="font-semibold">{assignment.celebration_booking_services?.service_name_snapshot || 'Service unavailable'}</p><p className="mt-0.5 text-xs text-slate-500">{assignment.event_vendors?.vendor_name || 'Former vendor'}</p><p className="mt-1 text-xs text-slate-500">{assignment.scheduled_date ? formatBookingDate(assignment.scheduled_date) : 'Date not scheduled'} · {assignment.agreed_cost === null ? 'Cost not agreed' : bookingMoney(assignment.agreed_cost)}</p></div><BookingBadge status={assignment.status} /></li>)}</ul> : vendors.data && <p className="py-3 text-sm text-slate-500">No vendor assignments yet.</p>}</ResourceMessage><div className="mt-3 flex justify-end"><BookingViewLink onClick={() => navigate('vendors')}>View All Vendors</BookingViewLink></div>
            </BookingCard></div>
            <div className={styles.services}><BookingServices id={id} compact onViewAll={() => navigate('services')} /></div>
            <div className={styles.activity}><BookingCard title="Recent Activity" icon={History} action={<BookingViewLink onClick={() => navigate('history')}>View Full History</BookingViewLink>}><BookingActivityList activities={activities.slice(0, 2)} /></BookingCard></div>
            <div className={styles.leads}><BookingLeads id={id} /></div>
            <div className={styles.amount}><BookingAmountHistory bookingId={id} compact /></div>
            <div className={styles.quotations}><AdditionalQuotationLinker bookingId={id} compact /></div>
          </div>
        </TabsContent>
        <TabsContent value="services" className="mt-0 space-y-4"><BookingServices id={id} /><AdditionalQuotationLinker bookingId={id} /><BookingAmountHistory bookingId={id} /><BookingLeads id={id} /></TabsContent>
        <TabsContent value="payments" className="mt-0 space-y-4"><BookingActionPanel onMount={consumeAction}><CustomerPayments bookingId={id} initialAction={action === 'payment'} /><ExpenseTracking bookingId={id} initialAction={action === 'expense'} /></BookingActionPanel></TabsContent>
        <TabsContent value="planning" className="mt-0"><BookingActionPanel onMount={consumeAction}><EventPlanning bookingId={id} initialAction={action === 'task'} /></BookingActionPanel></TabsContent>
        <TabsContent value="vendors" className="mt-0"><BookingActionPanel onMount={consumeAction}><VendorCoordination bookingId={id} initialAction={action === 'vendor'} /></BookingActionPanel></TabsContent>
        <TabsContent value="history" className="mt-0"><BookingWorkspaceHistory bookingId={id} /></TabsContent>
      </div>
    </Tabs>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><BookingDialogContent><DialogHeader><DialogTitle>Booking Actions</DialogTitle><DialogDescription>Manage this booking and its associated records.</DialogDescription></DialogHeader><BookingDeletion bookingId={id} /></BookingDialogContent></Dialog>
  </div></div>
}

function HeaderField({ icon: Icon, label, children }: { icon: typeof CalendarDays; label: string; children: ReactNode }) {
  return <div className="flex items-start gap-2.5"><span className={styles.icon}><Icon aria-hidden="true" /></span><div><dt className="mb-1 text-xs text-slate-500">{label}</dt><dd className="text-sm">{children}</dd></div></div>
}

// A quick action is consumed after its destination mounts. Browser history can
// then revisit a tab without replaying an old request to open a payment form.
function BookingActionPanel({ onMount, children }: { onMount: () => void; children: ReactNode }) {
  useEffect(onMount, [onMount])
  return <>{children}</>
}
