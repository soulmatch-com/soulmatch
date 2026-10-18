'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Quotation = { id: string; quotation_number: string; total_amount: number }
type LinkedQuotation = { quotation_id: string; linked_at: string; quotations: Quotation | null }
type BookingData = { booking: { status: string }; additionalQuotations: LinkedQuotation[]; eligibleAdditionalQuotations: Quotation[] }
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function AdditionalQuotationLinker({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<BookingData | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/bookings/${bookingId}`)
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Unable to load booking quotations')
    setData(body)
  }, [bookingId])
  useEffect(() => { void load().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load booking quotations')) }, [load])
  const canAdd = ['confirmed', 'planning', 'ready'].includes(data?.booking.status || '')
  async function addQuotation() {
    if (!selectedId || saving) return
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/additional-quotations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quotationId: selectedId }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to add quotation')
      setOpen(false); setSelectedId(''); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add quotation') } finally { setSaving(false) }
  }
  return <section className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">Additional quotations</h2><p className="mt-1 text-sm text-slate-600">Accepted add-on quotations extend this booking without replacing its original quotation.</p></div>{canAdd && <Button size="sm" onClick={() => { setError(''); setOpen(true) }}><Plus className="mr-1 h-4 w-4" />Add quotation</Button>}</div>{error && <p role="alert" className="mt-3 rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{data?.additionalQuotations.length ? <ul className="mt-4 divide-y">{data.additionalQuotations.map(link => <li key={link.quotation_id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><Link className="font-medium underline" href={`/admin/quotations/${link.quotation_id}/edit`}>{link.quotations?.quotation_number || 'Former quotation'}</Link><p className="mt-1 text-slate-500">Added {new Date(link.linked_at).toLocaleString()}</p></div><span>{link.quotations ? money.format(link.quotations.total_amount) : '—'}</span></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No additional quotations have been added.</p>}{!canAdd && data && <p className="mt-3 text-sm text-amber-800">Additional quotations can be added while a booking is Confirmed, Planning, or Ready.</p>}<Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}><DialogContent><DialogHeader><DialogTitle>Add accepted quotation</DialogTitle><DialogDescription>Its service snapshots and total will be added to this booking. This cannot be undone from the booking.</DialogDescription></DialogHeader><label className="text-sm font-medium text-slate-700">Quotation<select aria-label="Additional quotation" value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3"><option value="">Select an accepted quotation</option>{data?.eligibleAdditionalQuotations.map(quotation => <option key={quotation.id} value={quotation.id}>{quotation.quotation_number} — {money.format(quotation.total_amount)}</option>)}</select></label>{!data?.eligibleAdditionalQuotations.length && <p className="text-sm text-slate-500">No unlinked accepted quotations are available.</p>}<DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!selectedId || saving} onClick={() => void addQuotation()}>{saving ? 'Adding…' : 'Add quotation'}</Button></DialogFooter></DialogContent></Dialog></section>
}
