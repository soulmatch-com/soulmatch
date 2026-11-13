'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { formatBookingDate } from '@/lib/utils'
import { bookingLabel, bookingMoney, useBookingData, useBookingResource } from './booking-workspace-data'
import { BookingCard } from './BookingWorkspaceUI'
import styles from './BookingWorkspace.module.css'

type AuditActivity = { id: string; created_at: string; event_type: string; actorName: string; metadata: Record<string, unknown> | null; paymentReference?: string; previous_status?: string | null; new_status?: string }
const sources = ['All', 'Booking', 'Payments', 'Tasks', 'Vendors'] as const
type Source = typeof sources[number]

export function BookingWorkspaceHistory({ bookingId }: { bookingId: string }) {
  const booking = useBookingData(bookingId)
  const payments = useBookingResource<{ activities: AuditActivity[] }>(bookingId, 'payment-activities')
  const tasks = useBookingResource<{ activities: AuditActivity[] }>(bookingId, 'task-activities')
  const vendors = useBookingResource<{ activities: AuditActivity[] }>(bookingId, 'vendor-activities')
  const [filter, setFilter] = useState<Source>('All')
  const groups = [{ source: 'Booking', query: booking }, { source: 'Payments', query: payments }, { source: 'Tasks', query: tasks }, { source: 'Vendors', query: vendors }] as const
  const entries: (AuditActivity & { source: Source })[] = groups.flatMap(({ source, query }) => (query.data?.activities ?? []).map(activity => ({ ...activity, source })))
    .filter(entry => filter === 'All' || entry.source === filter)
    .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id.localeCompare(left.id))
  return <BookingCard title="Activity History" icon={History}>
    <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter activity history">{sources.map(source => <button type="button" key={source} aria-pressed={filter === source} className={`rounded-full border px-3 py-2 text-xs font-medium ${filter === source ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-100 text-slate-600'}`} onClick={() => setFilter(source)}>{source}</button>)}</div>
    {groups.filter(({ source }) => filter === 'All' || source === filter).map(({ source, query }) => query.error && <div role="alert" key={source} className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{source} history: {query.error.message} <button type="button" className="font-semibold underline" onClick={() => void query.refetch()}>Retry</button></div>)}
    {groups.some(({ source, query }) => query.isPending && (filter === 'All' || filter === source)) && <p role="status" className="mb-4 text-sm text-slate-500">Loading activity history…</p>}
    <ol className={styles.timeline}>{entries.map(entry => <li key={`${entry.source}-${entry.id}`}><span className={styles.timelineDot}><History className="size-3 text-violet-500" aria-hidden="true" /></span><article className="flex-1 border-b border-violet-100 pb-4"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{bookingLabel(entry.event_type)}{entry.previous_status && entry.new_status ? `: ${bookingLabel(entry.previous_status)} → ${bookingLabel(entry.new_status)}` : ''}</h3><span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{entry.source}</span></div><p className="mt-1 text-xs text-slate-500">{formatBookingDate(entry.created_at)} · {entry.actorName || 'System'}</p>{entry.paymentReference && <p className="mt-1 text-xs text-slate-500">{entry.paymentReference}</p>}<ActivityNotes metadata={entry.metadata} /></article></li>)}</ol>
    {!entries.length && !groups.some(({ query }) => query.isPending || query.error) && <p className="py-4 text-sm text-slate-500">No activity recorded.</p>}
  </BookingCard>
}

function ActivityNotes({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const reason = metadata.reason ?? metadata.cancellation_reason
  return <>{typeof reason === 'string' && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{reason}</p>}{typeof metadata.previous_total === 'number' && typeof metadata.new_total === 'number' && <p className="mt-2 text-sm">{bookingMoney(metadata.previous_total)} → {bookingMoney(metadata.new_total)}</p>}</>
}
