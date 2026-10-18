'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function QuotationBookingAction({ quotationId, status }: { quotationId: string; status: string }) {
  const router = useRouter(); const [bookingId, setBookingId] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [confirming, setConfirming] = useState(false); const triggerRef = useRef<HTMLButtonElement | null>(null)
  async function refreshBooking() { const response = await fetch(`/api/admin/bookings?quotationId=${quotationId}&pageSize=1`); const data = await response.json(); if (response.ok) setBookingId(data.bookings?.[0]?.id || null); return data.bookings?.[0]?.id as string | undefined }
  useEffect(() => { let current = true; void fetch(`/api/admin/bookings?quotationId=${quotationId}&pageSize=1`).then(async response => { const data = await response.json(); if (current && response.ok) setBookingId(data.bookings?.[0]?.id || null) }).catch(() => {}); return () => { current = false } }, [quotationId])
  if (bookingId) return <Button asChild size="sm"><a href={`/admin/bookings/${bookingId}`}>View booking</a></Button>
  if (status !== 'accepted') return null
  function close() { setConfirming(false); queueMicrotask(() => triggerRef.current?.focus()) }
  async function create() { setSaving(true); setError(''); try { const response = await fetch('/api/admin/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quotationId }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { if (response.status === 409) { const existing = await refreshBooking(); if (existing) { close(); router.push(`/admin/bookings/${existing}`); return } } throw new Error(data.error || `Unable to create booking (${response.status}).`) }; router.push(`/admin/bookings/${data.booking.id}`) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create booking.') } finally { setSaving(false) } }
  return <span className="inline-flex flex-col items-start gap-1"><Button ref={triggerRef} type="button" size="sm" disabled={saving} onClick={() => { setError(''); setConfirming(true) }}>Create booking</Button>{error && <span role="alert" className="text-xs text-rose-700">{error}</span>}<Dialog open={confirming} onOpenChange={open => !saving && !open && close()}><DialogContent><DialogHeader><DialogTitle>Create booking</DialogTitle><DialogDescription>Create one operational booking from this accepted quotation. Its services, prices, and linked leads will be snapshotted.</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<DialogFooter><Button variant="outline" disabled={saving} onClick={close}>Cancel</Button><Button disabled={saving} onClick={() => void create()}>{saving ? 'Creating booking…' : 'Confirm'}</Button></DialogFooter></DialogContent></Dialog></span>
}
