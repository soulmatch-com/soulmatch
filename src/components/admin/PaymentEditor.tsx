'use client'

import { useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookingDialogContent, BookingFormGrid } from '@/components/admin/BookingDialog'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { notifyBookingUpdated } from '@/lib/admin/booking-updates'

const methods = ['cash', 'upi', 'bank_transfer', 'card_external', 'other'] as const
const methodLabels = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', card_external: 'Card (External)', other: 'Other' }
export type EditablePayment = {
  id: string; payment_reference: string; amount: number; payment_method: string | null
  external_reference: string | null; payment_date: string; notes: string | null; canEdit: boolean
}
const localDateTime = (value: string) => {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

export function PaymentEditor({ bookingId, payment }: { bookingId: string; payment: EditablePayment }) {
  const [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [amount, setAmount] = useState(''), [method, setMethod] = useState('upi'), [external, setExternal] = useState('')
  const [paymentDate, setPaymentDate] = useState(''), [notes, setNotes] = useState(''), [reason, setReason] = useState('')
  const requestKey = useRef(''), trigger = useRef<HTMLButtonElement>(null)

  function startEdit() {
    setAmount(String(payment.amount)); setMethod(payment.payment_method || 'upi'); setExternal(payment.external_reference || '')
    setPaymentDate(localDateTime(payment.payment_date)); setNotes(payment.notes || ''); setReason(''); setError('')
    requestKey.current = crypto.randomUUID()
    setOpen(true)
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !reason.trim()) return
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/payments/${payment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: requestKey.current, amount: Number(amount), method,
          externalReference: external, paymentDate: paymentDate === localDateTime(payment.payment_date) ? payment.payment_date : new Date(paymentDate).toISOString(),
          notes, reason }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (response.status === 409) notifyBookingUpdated(bookingId)
        throw new Error(body.error || 'Unable to edit payment')
      }
      setOpen(false)
      notifyBookingUpdated(bookingId)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to edit payment') }
    finally { setSaving(false) }
  }

  return <>
    <Button ref={trigger} size="icon" className="size-11 xl:size-9" variant="outline" aria-label="Edit" disabled={!payment.canEdit}
      title={!payment.canEdit ? 'Receipts with refunds, reversals or earlier edits cannot be edited. Select the latest corrected receipt.' : 'Edit recorded payment'}
      onClick={startEdit}><Pencil aria-hidden="true" className="h-4 w-4" /></Button>
    <Dialog open={open} onOpenChange={value => !saving && setOpen(value)}>
      <BookingDialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto" onCloseAutoFocus={event => {
        if (trigger.current && !trigger.current.disabled) { event.preventDefault(); trigger.current.focus() }
      }}><form onSubmit={event => void submit(event)} className="space-y-4">
        <DialogHeader><DialogTitle>Edit recorded payment</DialogTitle><DialogDescription>Correct {payment.payment_reference}. The original receipt stays in history, and a corrected receipt is created with your reason.</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <BookingFormGrid><label className="block text-sm">Amount (₹)<input aria-label="Edit payment amount" required disabled={saving} type="number" min="0.01" max="9999999999.99" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>
        <label className="block text-sm">Payment method<select aria-label="Edit payment method" disabled={saving} value={method} onChange={event => setMethod(event.target.value)} className="mt-1 h-9 w-full rounded border px-2">{methods.map(value => <option key={value} value={value}>{methodLabels[value]}</option>)}</select></label>
        <label className="block text-sm">External reference<input aria-label="Edit external reference" disabled={saving} maxLength={200} value={external} onChange={event => setExternal(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label>
        <label className="block text-sm">Payment date and time<input aria-label="Edit payment date" required disabled={saving} type="datetime-local" step="1" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} className="mt-1 h-9 w-full rounded border px-2" /></label></BookingFormGrid>
        <label className="block text-sm">Remarks<textarea aria-label="Edit payment remarks" disabled={saving} maxLength={2000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <label className="block text-sm">Reason for edit<textarea aria-label="Reason for payment edit" required disabled={saving} maxLength={2000} rows={2} value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded border p-2" /></label>
        <DialogFooter className="gap-2 sm:space-x-0"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !reason.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
      </form></BookingDialogContent>
    </Dialog>
  </>
}
