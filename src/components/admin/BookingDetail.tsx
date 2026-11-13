'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Check, ChevronDown, Flag, Layers3, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBookingDate } from '@/lib/utils'
import { notifyBookingUpdated } from '@/lib/admin/booking-updates'
import { bookingLabel, bookingMoney, useBookingData, type BookingActivity } from './booking-workspace-data'
import { BookingCard, BookingBadge, BookingViewLink } from './BookingWorkspaceUI'
import styles from './BookingWorkspace.module.css'

export function BookingStatus({ id }: { id: string }) {
  const { data: detail, refetch } = useBookingData(id)
  const [error, setError] = useState(''), [saving, setSaving] = useState(false), [reason, setReason] = useState(''), [controls, setControls] = useState(false)
  const controlsHeading = useRef<HTMLHeadingElement>(null)
  if (!detail) return null
  const { booking, activities, allowedTransitions } = detail
  const stages = ['pending_confirmation', 'confirmed', 'planning', 'ready', 'completed']
  if (booking.status === 'cancelled') stages.push('cancelled')
  const currentIndex = stages.indexOf(booking.status)
  async function transition(toStatus: string) {
    if (saving) return
    if (toStatus === 'cancelled' && !reason.trim()) { setError('A cancellation reason is required.'); return }
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/bookings/${id}/lifecycle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStatus, cancellationReason: toStatus === 'cancelled' ? reason : undefined }) })
      const data = await response.json()
      if (!response.ok) { if (response.status === 409) await refetch(); throw new Error(data.error) }
      notifyBookingUpdated(id)
      await refetch({ throwOnError: true })
      setReason('')
      requestAnimationFrame(() => controlsHeading.current?.focus())
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update booking.') }
    finally { setSaving(false) }
  }
  return <BookingCard title="Booking Status" icon={Flag} action={allowedTransitions.length ? <Button size="sm" variant="outline" className="gap-1 px-2 text-[11px]" aria-expanded={controls} aria-controls="booking-status-controls" onClick={() => setControls(!controls)}>Change Status<ChevronDown className="size-3" /></Button> : undefined}>
    <ol className={styles.timeline}>{stages.map((status, index) => {
      const activity = activities.find(item => item.new_status === status && ['created', 'booking_created', 'status_transition'].includes(item.event_type))
      const visited = booking.status === 'cancelled' ? Boolean(activity) || status === 'pending_confirmation' : index <= currentIndex
      return <li key={status} aria-current={booking.status === status ? 'step' : undefined}>
        <span className={styles.timelineDot} data-visited={visited}>{visited && <Check className="size-3" aria-hidden="true" />}</span>
        <div className={`flex-1 rounded-lg px-2 py-1 ${booking.status === status ? status === 'cancelled' ? 'bg-rose-50' : 'bg-emerald-50' : ''}`}><p className={visited ? 'font-semibold' : 'text-slate-500'}>{bookingLabel(status)}</p>{activity && <p className="mt-0.5 text-xs text-slate-500">{formatBookingDate(activity.created_at)}</p>}</div>
      </li>
    })}</ol>
    {controls && <div id="booking-status-controls" className="mt-4 border-t border-violet-100 pt-3"><h3 ref={controlsHeading} tabIndex={-1} className="text-sm font-semibold">Status Controls</h3>{allowedTransitions.includes('cancelled') && <input aria-label="Cancellation reason (required to cancel)" className="mt-3 min-h-11 w-full rounded-md border border-slate-300 px-2 text-sm" placeholder="Cancellation reason (required to cancel)" value={reason} onChange={event => setReason(event.target.value)} />}<div className="mt-3 flex flex-wrap gap-2">{allowedTransitions.map(status => <Button key={status} size="sm" variant="outline" disabled={saving} onClick={() => void transition(status)}>{bookingLabel(status)}</Button>)}</div>{!allowedTransitions.length && <p className="mt-2 text-sm text-slate-500">No further status changes are available.</p>}</div>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  </BookingCard>
}

export function BookingServices({ id, compact = false, onViewAll }: { id: string; compact?: boolean; onViewAll?: () => void }) {
  const { data } = useBookingData(id)
  const services = data?.services ?? []
  return <BookingCard title="Services" icon={Layers3} subtitle="Service snapshots" action={onViewAll ? <BookingViewLink onClick={onViewAll}>View All Services</BookingViewLink> : undefined}>
    {services.length ? <ul className="divide-y divide-violet-100">{(compact ? services.slice(0, 2) : services).map(service => <li key={service.id} className="py-2 text-sm"><div className="flex flex-wrap items-start justify-between gap-3"><p className="font-semibold">{service.service_name_snapshot} × {service.quantity}</p><span className="shrink-0 font-semibold">{bookingMoney(service.total_price_snapshot)}</span></div><p className={`mt-1 text-xs leading-relaxed text-slate-500 ${compact ? 'line-clamp-2' : ''}`}>{service.service_code_snapshot}{service.description_snapshot ? ` · ${service.description_snapshot}` : ''}</p><div className="mt-1.5"><BookingBadge status={service.fulfillment_status} /></div></li>)}</ul> : <p className="text-sm text-slate-500">No services recorded.</p>}
    {compact && services.length > 2 && <p className="mt-2 text-xs text-slate-500">+{services.length - 2} more services in Services &amp; Quotations</p>}
  </BookingCard>
}

export function BookingLeads({ id }: { id: string }) {
  const { data } = useBookingData(id)
  return <BookingCard title="Linked Leads" icon={UserRound}>{data?.leads.length ? <ul className="space-y-2 text-sm">{data.leads.map(link => <li key={link.lead_id}><Link className="font-medium text-violet-800 hover:underline" href={`/admin/leads/${link.lead_id}`}>{link.leads?.contact_name || 'View lead'}</Link><p className="mt-0.5 text-xs text-slate-500">{link.leads?.mobile || link.leads?.email || 'No contact'}</p></li>)}</ul> : <p className="text-sm text-slate-500">No leads linked to this booking.</p>}</BookingCard>
}

export function BookingActivityList({ activities }: { activities: BookingActivity[] }) {
  return activities.length ? <ol className={styles.timeline}>{activities.map(activity => <li key={activity.id}><span className={styles.timelineDot} data-visited="true"><Check className="size-3" aria-hidden="true" /></span><div><p className="font-medium">{bookingLabel(activity.event_type)}{activity.previous_status ? `: ${bookingLabel(activity.previous_status)} → ${bookingLabel(activity.new_status)}` : ''}</p><p className="mt-1 text-xs text-slate-500">{formatBookingDate(activity.created_at)} · {activity.actorName || 'System'}</p>{typeof activity.metadata?.cancellation_reason === 'string' && <p className="mt-1 text-xs text-rose-700">{activity.metadata.cancellation_reason}</p>}</div></li>)}</ol> : <p className="text-sm text-slate-500">No activity recorded.</p>
}
