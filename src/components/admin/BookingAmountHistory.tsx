'use client'

import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useBookingData } from './booking-workspace-data'
import { BookingCard } from './BookingWorkspaceUI'
import { Button } from '@/components/ui/button'
import { BookingDialogContent } from '@/components/admin/BookingDialog'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { notifyBookingUpdated } from '@/lib/admin/booking-updates'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
export function BookingAmountHistory({ bookingId, compact = false }: { bookingId: string; compact?: boolean }) {
  const { data: detail, refetch } = useBookingData(bookingId)
  const load = () => refetch({ throwOnError: true })
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [expectedTotal, setExpectedTotal] = useState(0)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !detail) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/amount`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedTotal, newTotal: Number(amount), reason }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (response.status === 409) {
          await load()
          // A stale edit must be reopened against the refreshed total.
          if (body.code === '40001') setOpen(false)
        }
        throw new Error(body.error || 'Unable to alter booking amount')
      }
      setOpen(false)
      notifyBookingUpdated(bookingId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to alter booking amount')
    } finally { setSaving(false) }
  }

  const history = detail?.activities.filter(activity => ['amount_changed', 'additional_quotation_linked'].includes(activity.event_type)) ?? []
  const action = detail && !['completed', 'cancelled'].includes(detail.booking.status) ? <Button size="sm" variant="outline" className="px-2 text-xs text-violet-700" onClick={() => {
    setExpectedTotal(Number(detail.booking.quoted_total)); setAmount(String(detail.booking.quoted_total)); setReason(''); setError(''); setOpen(true)
  }}>Alter amount</Button> : undefined
  return <BookingCard title={compact ? "Amount Alteration" : "Amount Alteration History"} icon={ArrowLeftRight} action={action}>
    {!compact && <p className="text-sm text-slate-600">Amount changes are saved with the administrator, date, and reason.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    {!detail ? <p className="mt-3 text-sm text-slate-500">Loading amount history…</p> : history.length ? <ul className="mt-4 divide-y">
      {(compact ? history.slice(0, 1) : history).map(activity => <li key={activity.id} className="py-3 text-sm">
        <p className="font-medium text-slate-900">{activity.metadata?.previous_total !== undefined && activity.metadata?.new_total !== undefined
          ? `${money.format(Number(activity.metadata?.previous_total))} → ${money.format(Number(activity.metadata?.new_total))}`
          : `Additional quotation: +${money.format(Number(activity.metadata?.added_total ?? 0))}`}</p>
        <p className="mt-1 whitespace-pre-wrap text-slate-700">{(typeof activity.metadata?.reason === 'string' ? activity.metadata.reason : '') || (activity.event_type === 'additional_quotation_linked' ? 'Accepted additional quotation added' : 'Amount altered')}</p>
        <p className="mt-1 text-xs text-slate-500">{activity.actorName} · {new Date(activity.created_at).toLocaleString('en-IN')}</p>
      </li>)}
    </ul> : <p className="mt-3 text-sm text-slate-500">No amount alterations recorded.</p>}
    <Dialog open={open} onOpenChange={value => !saving && setOpen(value)}>
      <BookingDialogContent><form onSubmit={event => void submit(event)} className="space-y-4">
        <DialogHeader><DialogTitle>Alter booking amount</DialogTitle><DialogDescription>Current total: {money.format(expectedTotal)}. The change and your reason will be saved in the booking history.</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <label className="block text-sm font-medium">New booking amount<input aria-label="New booking amount" required disabled={saving} type="number" min="0" max="9999999999.99" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 h-10 w-full rounded border px-3" /></label>
        <label className="block text-sm font-medium">Reason for amount change<textarea aria-label="Reason for amount change" required disabled={saving} maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded border p-3" /></label>
        <DialogFooter className="gap-2 sm:space-x-0"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !reason.trim() || amount === '' || Number(amount) === expectedTotal}>{saving ? 'Saving…' : 'Save amount'}</Button></DialogFooter>
      </form></BookingDialogContent>
    </Dialog>
  </BookingCard>
}
