'use client'

import { useCallback, useRef, useState } from 'react'
import { useBookingResource, useBookingSummary } from './booking-workspace-data'
import { FileDown, HandCoins, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookingDialogContent, BookingField, BookingFormGrid } from '@/components/admin/BookingDialog'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PaymentEditor, type EditablePayment } from '@/components/admin/PaymentEditor'
import { PaymentAuditHistory, type PaymentActivity } from '@/components/admin/PaymentAuditHistory'
import { notifyBookingUpdated } from '@/lib/admin/booking-updates'

const money=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}),methods=['cash','upi','bank_transfer','card_external','other'] as const,paymentMethodLabel:Record<typeof methods[number],string>={cash:'Cash',upi:'UPI',bank_transfer:'Bank Transfer',card_external:'Card (External)',other:'Other'}
type Payment=EditablePayment & {transaction_type:string;original_payment_id:string|null;currency:string;remainingAmount:number}
type Mode='receipt'|'refund'|'reversal'|null
type PendingPayment = { path: string; body: Record<string, unknown> }

export function CustomerPayments({bookingId,initialAction=false}:{bookingId:string;initialAction?:boolean}){
 const {data:summaryData,refetch:refreshSummary,error:summaryError}=useBookingSummary(bookingId)
 const summary=summaryData?.summary
 const recordTrigger=useRef<HTMLButtonElement>(null)
 const paymentQuery = useBookingResource<{ payments: Payment[] }>(bookingId, 'payments')
 const auditQuery = useBookingResource<{ activities: PaymentActivity[]; bookingReference: string | null }>(bookingId, 'payment-activities')
 const payments = paymentQuery.data?.payments ?? []
 const activities = auditQuery.data?.activities ?? []
 const bookingReference = auditQuery.data?.bookingReference ?? null
 const [error, setError] = useState(''), [mode, setMode] = useState<Mode>(initialAction ? 'receipt' : null)
 const [original, setOriginal] = useState<Payment | null>(null), [saving, setSaving] = useState(false)
 const [amount, setAmount] = useState(''), [method, setMethod] = useState<typeof methods[number]>('upi')
 const [reason, setReason] = useState(''), [external, setExternal] = useState(''), [remarks, setRemarks] = useState('')
 const [uncertain, setUncertain] = useState(false)
 const triggerRef = useRef<HTMLButtonElement | null>(null)
 const savingRef = useRef(false)
 const pendingPayment = useRef<PendingPayment | null>(null)
 const { refetch: refreshPayments } = paymentQuery, { refetch: refreshAudit } = auditQuery
 const load = useCallback(async () => {
   await Promise.all([refreshPayments({ throwOnError: true }), refreshAudit({ throwOnError: true }), refreshSummary({ throwOnError: true })])
 }, [refreshPayments, refreshAudit, refreshSummary])
 const loadError = paymentQuery.error || auditQuery.error || summaryError
 function resetForm() {
   setMode(null); setOriginal(null); setAmount(''); setReason(''); setExternal(''); setRemarks('')
   setUncertain(false); pendingPayment.current = null
 }
 function openForm(next: Exclude<Mode, null>, trigger: HTMLButtonElement, payment: Payment | null = null) {
   if (savingRef.current) return
   resetForm(); setError(''); triggerRef.current = trigger; setOriginal(payment); setMode(next)
 }
 const close = () => { if (!savingRef.current) resetForm() }
 async function submit() {
   if (savingRef.current || !mode) return
   const value = Number(amount)
   if (!Number.isFinite(value) || value <= 0) { setError('Enter a positive amount.'); return }
   if (mode !== 'receipt' && !reason.trim()) { setError('A reason is required.'); return }
   if (mode !== 'receipt' && !original) { setError('Select the original receipt.'); return }
   savingRef.current = true; setSaving(true); setError('')
   if (!pendingPayment.current) {
     const paymentDate = new Date().toISOString(), idempotencyKey = crypto.randomUUID()
     pendingPayment.current = {
       path: mode === 'receipt' ? `/api/admin/bookings/${bookingId}/payments` : `/api/admin/bookings/${bookingId}/payments/${original!.id}/${mode === 'refund' ? 'refund' : 'reverse'}`,
       body: mode === 'receipt'
         ? { idempotencyKey, amount: value, currency: 'INR', method, externalReference: external || undefined, notes: remarks || undefined, paymentDate }
         : { idempotencyKey, amount: value, currency: 'INR', reason, paymentDate },
     }
   }
   try {
     const { path, body } = pendingPayment.current
     const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
     if (!response.ok) {
       const result = await response.json().catch(() => ({}))
       // A rejected request can be corrected. An uncertain server response must
       // retry the same operation, with its original key and payment details.
       if (response.status < 500) { pendingPayment.current = null; setUncertain(false) }
       if (response.status === 409) { notifyBookingUpdated(bookingId); void load().catch(() => {}) }
       throw Error(result.error || 'Unable to save payment')
     }
     // Once saved, close before refreshing. A failed read must never invite a
     // second financial write for an already committed receipt or adjustment.
     resetForm()
     notifyBookingUpdated(bookingId)
     await load().catch(() => setError('Payment saved, but the latest totals could not be loaded. Retry loading the payment details.'))
   } catch (cause) {
     if (pendingPayment.current) setUncertain(true)
     setError(cause instanceof Error ? cause.message : 'Unable to save payment')
   } finally { savingRef.current = false; setSaving(false) }
 }
 const label=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase())
 const edits = activities.filter(activity => activity.event_type === 'edited')
 const supersededReceipts = new Set(edits.map(activity => activity.payment_id))
 const correctionReversals = new Set(edits.map(activity => activity.metadata?.reversal_payment_id).filter(Boolean))
 const correctedReceipts = new Set(edits.map(activity => activity.metadata?.replacement_payment_id).filter(Boolean))
 const currentPayments = payments.filter(payment => !supersededReceipts.has(payment.id) && !correctionReversals.has(payment.id))

 return <section className="rounded-xl border bg-white p-5">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div><h2 className="font-semibold">Customer Payments</h2><p className="text-sm text-slate-500">Manual, verified entries only. Vendor costs are tracked separately.</p></div>
   <Button ref={recordTrigger} size="sm" disabled={saving} onClick={event=>openForm('receipt',event.currentTarget)}>Record Payment</Button>
  </div>
  {!mode&&(error||loadError)&&<div role="alert" className="mt-3 text-sm text-rose-700">{error||loadError?.message} <button type="button" className="font-semibold underline" onClick={()=>void load().then(()=>setError('')).catch(()=>{})}>Retry loading</button></div>}
  {summary ? <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:grid-cols-4">
   {[['Booking Total',summary.booking_total],['Gross Received',summary.gross_received],['Refunded',summary.total_refunded],['Reversed',summary.total_reversed],['Net Received',summary.net_received],['Outstanding',summary.outstanding_balance]].map(([l,v])=><div key={String(l)}><dt className="text-slate-500">{l}</dt><dd className="font-medium">{money.format(Number(v))}</dd></div>)}
   <div><dt className="text-slate-500">Payment Status</dt><dd className="font-medium capitalize">{label(summary.payment_status)}</dd></div>
  </dl> : <p className="mt-3 text-sm">Loading Payment Summary…</p>}
  <div className="mt-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <h3 className="text-sm font-semibold">Payment History</h3>
    <PaymentAuditHistory activities={activities} bookingReference={bookingReference}/>
   </div>
   <p className="mt-2 text-sm text-slate-500">Shows the latest payment amounts. Previous versions are available in audit history.</p>
   {currentPayments.length ? <div className="mt-2 divide-y">
    {currentPayments.map(payment => <div key={payment.id} data-testid="payment-history-row" className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
     <div>
      <div className="flex flex-wrap items-center gap-2">
       <strong className="text-base text-slate-900">{money.format(Number(payment.amount))}</strong>
       {correctedReceipts.has(payment.id) && <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">Edited</span>}
      </div>
      <p className="mt-1 text-slate-600"><b>{payment.payment_reference}</b> · {label(payment.transaction_type)} · {new Date(payment.payment_date).toLocaleDateString('en-IN')}</p>
     </div>
     <div className="flex flex-wrap gap-2">
      {payment.transaction_type === 'receipt' && <>
       <PaymentEditor bookingId={bookingId} payment={payment}/>
       <Button size="icon" className="size-11 xl:size-9" variant="outline" aria-label="Refund" title="Refund" disabled={saving||payment.remainingAmount<=0} onClick={event=>openForm('refund',event.currentTarget,payment)}><HandCoins aria-hidden="true" className="h-4 w-4" /></Button>
       <Button size="icon" className="size-11 xl:size-9" variant="outline" aria-label="Reverse" title="Reverse" disabled={saving||payment.remainingAmount<=0} onClick={event=>openForm('reversal',event.currentTarget,payment)}><RotateCcw aria-hidden="true" className="h-4 w-4" /></Button>
      </>}
      <a aria-label="Download PDF" title="Download PDF" className="inline-flex size-11 items-center justify-center xl:size-9 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" href={`/api/admin/bookings/${bookingId}/payments/${payment.id}/receipt`}><FileDown aria-hidden="true" className="h-4 w-4" /></a>
     </div>
    </div>)}
   </div> : <p className="mt-2 text-sm text-slate-500">{paymentQuery.isPending ? 'Loading payment entries…' : loadError ? 'Payment entries are unavailable.' : 'No Payment Entries Recorded.'}</p>}
  </div>
  <Dialog open={mode!==null} onOpenChange={open=>!open&&close()}>
   <BookingDialogContent showCloseButton={false} onCloseAutoFocus={event=>{const trigger=triggerRef.current??recordTrigger.current;if(trigger?.isConnected&&!trigger.disabled&&trigger.getClientRects().length){event.preventDefault();trigger.focus()}}}>
    <DialogHeader>
     <DialogTitle>{mode==='receipt'?'Record payment':mode==='refund'?'Record refund':'Reverse payment'}</DialogTitle>
     <DialogDescription>{mode==='receipt'?'Record a verified customer receipt.':`This permanently appends a ${mode} against ${original?.payment_reference}. Confirm only after checking the original entry.`}</DialogDescription>
    </DialogHeader>
    {error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}
    {uncertain && <p role="status" className="text-sm text-amber-800">The payment result could not be confirmed. Retry these same details to check or complete the original entry.</p>}
    <fieldset disabled={saving || uncertain} className="grid gap-4">
    <BookingField label="Amount (₹)"><input aria-label="Amount" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></BookingField>
    {mode==='receipt' ? <>
     <BookingFormGrid>
      <BookingField label="Payment method"><select aria-label="Payment method" value={method} onChange={e=>setMethod(e.target.value as typeof method)}>{methods.map(m=><option key={m} value={m}>{paymentMethodLabel[m]}</option>)}</select></BookingField>
      <BookingField label="External reference (optional)"><input aria-label="External reference" value={external} maxLength={200} onChange={e=>setExternal(e.target.value)} placeholder="Transaction or receipt ID"/></BookingField>
     </BookingFormGrid>
     <BookingField label="Remarks (optional)"><textarea aria-label="Remarks" value={remarks} onChange={e=>setRemarks(e.target.value)} maxLength={2000} placeholder="e.g. Advance for ceremony arrangements" rows={3}/></BookingField>
    </> : <BookingField label="Reason (required)"><textarea aria-label="Reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000} placeholder="Explain the reason for this adjustment" rows={3}/></BookingField>}
    </fieldset>
    <DialogFooter className="gap-2 sm:space-x-0"><Button variant="outline" disabled={saving} onClick={close}>Cancel</Button><Button disabled={saving} onClick={()=>void submit()}>{saving?'Saving…':mode==='receipt'?'Record payment':`Confirm ${mode}`}</Button></DialogFooter>
   </BookingDialogContent>
  </Dialog>
 </section>
}
