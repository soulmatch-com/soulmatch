'use client'

import { useId, useState, type ReactNode } from 'react'
import { Activity, ArrowRight, Check, ChevronDown, Clock3, Download, FilePenLine, Printer, ReceiptText, RotateCcw, UserRound, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookingDialogContent } from './BookingDialog'
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { auditDate, auditLabel, auditMoney, auditTitle, comparisonRows, groupPaymentAudit, paymentAuditCsv, paymentAuditPrintHtml, type AuditEvent, type PaymentActivity } from '@/lib/payments/payment-audit'

export type { PaymentActivity } from '@/lib/payments/payment-audit'

const statusStyles = {
  recorded: { label: 'Recorded', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', node: 'border-emerald-200 bg-emerald-50 text-emerald-600', Icon: Check },
  edited: { label: 'Modified', badge: 'border-amber-200 bg-amber-50 text-amber-800', node: 'border-amber-200 bg-amber-50 text-amber-700', Icon: FilePenLine },
  reversed: { label: 'Reversed', badge: 'border-rose-200 bg-rose-50 text-rose-700', node: 'border-rose-200 bg-rose-50 text-rose-600', Icon: RotateCcw },
  refunded: { label: 'Refunded', badge: 'border-blue-200 bg-blue-50 text-blue-700', node: 'border-blue-200 bg-blue-50 text-blue-600', Icon: Wallet },
}
function statusFor(type: string) {
  return statusStyles[type as keyof typeof statusStyles] ?? { label: auditLabel(type), badge: 'border-slate-200 bg-slate-50 text-slate-700', node: 'border-slate-200 bg-slate-50 text-slate-600', Icon: Activity }
}
function StatusBadge({ type }: { type: string }) {
  const status = statusFor(type)
  return <span className={'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5 ' + status.badge}>
    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{status.label}
  </span>
}
function Field({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return <div className="min-w-0">
    <dt className="text-xs leading-5 text-slate-500">{label}</dt>
    <dd className={'mt-0.5 break-words text-sm leading-6 text-slate-800 ' + (mono ? 'font-mono text-xs' : '')}>{children ?? 'Not available'}</dd>
  </div>
}
function Timestamp({ value }: { value: string | undefined }) {
  return <time dateTime={value}>{auditDate(value)}</time>
}

function ModificationDetails({ event }: { event: AuditEvent }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const { activity, correctedReceipt, reversal } = event
  const before = activity.metadata.previous_payment, after = activity.metadata.new_payment
  const reversalAmount = reversal?.payment?.amount
  const reversalDate = reversal?.payment?.payment_date ?? reversal?.created_at
  return <div className="-mx-4 -mb-4 mt-4 border-t border-slate-100 sm:-mx-5 sm:-mb-5">
    <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(value => !value)}
      className="flex w-full items-center justify-between gap-3 rounded-b-xl px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 sm:px-5">
      <span className="text-xs font-medium text-slate-700 sm:text-sm">Modification Information</span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
        {expanded ? 'Hide Details' : 'View Details'}
        <ChevronDown aria-hidden="true" className={'h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none ' + (expanded ? 'rotate-180' : '')} />
      </span>
    </button>
    <div className="grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none" style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}>
      <div id={detailsId} role="region" aria-label="Modification Information" aria-hidden={!expanded} inert={!expanded} className="min-h-0 overflow-hidden">
        <div className="space-y-5 border-t border-slate-100 bg-slate-50/60 px-4 py-5 sm:px-5">
          <section aria-labelledby={detailsId + '-receipts'}>
            <h4 id={detailsId + '-receipts'} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Receipt Information</h4>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Original Receipt ID" mono>{before?.reference ?? activity.paymentReference}</Field>
              <Field label="Corrected Receipt ID" mono>{correctedReceipt?.paymentReference ?? after?.reference ?? activity.metadata.replacement_payment_id}</Field>
              <Field label="Receipt creation status">{correctedReceipt?.payment?.status
                ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check aria-hidden="true" className="h-3.5 w-3.5" />{auditLabel(correctedReceipt.payment.status)}</span>
                : 'Not available'}</Field>
              <Field label="Receipt created"><Timestamp value={correctedReceipt?.payment?.created_at ?? correctedReceipt?.created_at} /></Field>
            </dl>
          </section>
          <section aria-labelledby={detailsId + '-comparison'}>
            <h4 id={detailsId + '-comparison'} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Changed Field Comparison</h4>
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
                <caption className="sr-only">Previous and updated payment details. Changed fields are highlighted.</caption>
                <colgroup><col className="w-[30%]" /><col className="w-[35%]" /><col className="w-[35%]" /></colgroup>
                <thead className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-medium text-slate-600 sm:text-xs">
                  <tr><th scope="col" className="px-3 py-2.5 font-medium">Field</th><th scope="col" className="px-3 py-2.5 font-medium">Previous Value</th><th scope="col" className="px-3 py-2.5 font-medium">Updated Value</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows(activity).map(row => <tr key={row.field} data-changed={row.changed}>
                    <th scope="row" className="break-words px-3 py-3 align-top font-medium text-slate-700">{row.field}{row.changed && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" role="img" aria-label="Changed field" />}</th>
                    <td className="break-words bg-slate-50/70 px-3 py-3 align-top text-slate-500 [overflow-wrap:anywhere]">{row.previous}</td>
                    <td className={'break-words px-3 py-3 align-top [overflow-wrap:anywhere] ' + (row.changed ? 'bg-amber-50/80 font-medium text-slate-900' : 'text-slate-700')}>{row.updated}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-labelledby={detailsId + '-reversal'} className="rounded-lg border border-rose-100 bg-rose-50/30 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <h4 id={detailsId + '-reversal'} className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Reversal Information</h4>
              {reversal && <StatusBadge type="reversed" />}
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Reversal ID" mono>{reversal?.paymentReference ?? activity.metadata.reversal_payment_id ?? 'Not available'}</Field>
              <Field label="Reversal date and time"><Timestamp value={reversalDate} /></Field>
              {reversalAmount !== undefined && reversalAmount !== null && <Field label="Reversed amount">{auditMoney(reversalAmount)}</Field>}
              <Field label="Reversal reason">{reversal?.metadata.reason ?? reversal?.payment?.notes ?? 'Not available'}</Field>
              {!reversal && <Field label="Reversal status">Not available</Field>}
            </dl>
          </section>
          <section aria-labelledby={detailsId + '-admin'}>
            <h4 id={detailsId + '-admin'} className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Administrator Information</h4>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Modified by">{activity.actorName}</Field>
              <Field label="Administrator role">{auditLabel(activity.actorRole)}</Field>
              <Field label="Modification timestamp"><Timestamp value={activity.created_at} /></Field>
              <Field label="Administrator email">{activity.actorEmail}</Field>
              <div className="sm:col-span-2"><Field label="Modification reason"><span className="whitespace-pre-wrap">{activity.metadata.reason ?? 'Not available'}</span></Field></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  </div>
}

function TimelineEntry({ event }: { event: AuditEvent }) {
  const { activity } = event
  const status = statusFor(activity.event_type), Icon = status.Icon
  const isModified = activity.event_type === 'edited'
  const headingId = useId()
  return <li data-testid="audit-timeline-entry" data-event-type={activity.event_type} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 sm:gap-4">
    <span className={'relative z-10 mt-4 flex h-7 w-7 items-center justify-center rounded-full border ring-4 ring-slate-50 ' + status.node}><Icon aria-hidden="true" className="h-3.5 w-3.5" /></span>
    <article aria-labelledby={headingId} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_0_rgb(15_23_42_/_0.02)] sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 id={headingId} className="text-sm font-semibold text-slate-900">{auditTitle(activity.event_type)}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs"><Clock3 aria-hidden="true" className="h-3 w-3" /><Timestamp value={activity.created_at} /></p>
        </div>
        <StatusBadge type={activity.event_type} />
      </header>
      {isModified ? <>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3.5 sm:gap-5 sm:px-4">
          <div><p className="text-[11px] text-slate-500 sm:text-xs">Previous amount</p><p className="mt-1 break-words text-base font-medium tabular-nums text-slate-500 sm:text-xl">{auditMoney(activity.metadata.previous_payment?.amount)}</p></div>
          <ArrowRight aria-hidden="true" className="h-4 w-4 text-slate-300" />
          <div><p className="text-[11px] text-slate-500 sm:text-xs">Updated amount</p><p className="mt-1 break-words text-base font-semibold tabular-nums text-slate-900 sm:text-xl">{auditMoney(activity.metadata.new_payment?.amount)}</p></div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><UserRound aria-hidden="true" className="h-3.5 w-3.5" />Modified by <span className="font-medium text-slate-700">{activity.actorName}</span></p>
        <ModificationDetails event={event} />
      </> : <>
        <p className="mt-4 text-xl font-semibold tabular-nums tracking-tight text-slate-900">{auditMoney(activity.payment?.amount ?? activity.metadata.amount)}</p>
        <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
          <Field label={activity.event_type === 'recorded' ? 'Receipt ID' : 'Transaction ID'} mono>{activity.paymentReference}</Field>
          <Field label="Payment date"><Timestamp value={activity.payment?.payment_date} /></Field>
          {activity.event_type === 'recorded' && <Field label="Payment method">{auditLabel(activity.payment?.payment_method)}</Field>}
          <Field label="Administrator">{activity.actorName}</Field>
          {activity.metadata.reason && <div className="sm:col-span-2"><Field label="Reason">{activity.metadata.reason}</Field></div>}
        </dl>
      </>}
    </article>
  </li>
}

export function PaymentAuditHistory({ activities, bookingReference }: { activities: PaymentActivity[]; bookingReference: string | null }) {
  const [open, setOpen] = useState(false), [error, setError] = useState('')
  const events = groupPaymentAudit(activities)
  const summary = [
    { label: 'Total Activities', count: events.length, Icon: Activity },
    { label: 'Original Payments', count: events.filter(event => event.activity.event_type === 'recorded').length, Icon: ReceiptText },
    { label: 'Modified Payments', count: events.filter(event => event.activity.event_type === 'edited').length, Icon: FilePenLine },
  ]
  function exportHistory() {
    const url = URL.createObjectURL(new Blob(['\uFEFF', paymentAuditCsv(activities, bookingReference)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = (bookingReference ?? 'booking') + '-financial-audit.csv'
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function printHistory() {
    setError('')
    const frame = document.createElement('iframe')
    frame.title = 'Print financial audit history'
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
    frame.onload = () => {
      const printWindow = frame.contentWindow
      if (!printWindow) { setError('Unable to prepare print preview. Please try again.'); frame.remove(); return }
      printWindow.addEventListener('afterprint', () => frame.remove(), { once: true })
      printWindow.focus(); printWindow.print()
    }
    frame.srcdoc = paymentAuditPrintHtml(activities, bookingReference)
    document.body.appendChild(frame)
  }
  return <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setError('') }}>
    <DialogTrigger asChild><Button type="button" size="sm" variant="outline">View audit history</Button></DialogTrigger>
    <BookingDialogContent layout="audit" showCloseButton={false} className="flex max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-[960px] flex-col gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 text-slate-900 shadow-2xl [overflow-wrap:anywhere] sm:max-w-[960px] dark:bg-white dark:text-slate-900">
      <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-5 text-left sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 sm:flex"><ReceiptText aria-hidden="true" className="h-5 w-5 text-slate-600" /></span>
            <div className="min-w-0"><DialogTitle className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-slate-900">Financial Audit History</DialogTitle>
              <DialogDescription className="mt-1.5 max-w-xl text-xs leading-5 text-slate-500 sm:text-[13px]">Complete history of payment activities, modifications and transaction changes.</DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>Booking <span className="ml-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-slate-700">{bookingReference ?? 'Not available'}</span></span>
                <span className="text-slate-300" aria-hidden="true">|</span><span>All times in IST</span>
              </div>
            </div>
          </div>
          <DialogClose asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700" aria-label="Close audit history" title="Close audit history"><X aria-hidden="true" className="h-4 w-4" /></Button></DialogClose>
        </div>
      </DialogHeader>
      <div data-testid="audit-scroll-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/70 px-3 py-5 sm:px-6">
        <dl className="mb-6 grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-200 bg-white py-3.5">
          {summary.map(({ label, count, Icon }) => <div key={label} className="min-w-0 px-3 sm:px-5">
            <dt className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 sm:text-xs"><Icon aria-hidden="true" className="hidden h-3.5 w-3.5 sm:block" />{label}</dt>
            <dd className="mt-1.5 text-xl font-semibold tabular-nums leading-none text-slate-900 sm:text-2xl">{count.toString().padStart(2, '0')}</dd>
          </div>)}
        </dl>
        {error && <p role="alert" className="mb-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {events.length ? <ol aria-label="Payment audit timeline" className="relative space-y-4 before:absolute before:bottom-6 before:left-[13px] before:top-6 before:w-px before:bg-slate-200">
          {events.map(event => <TimelineEntry key={event.activity.id} event={event} />)}
        </ol> : <div className="py-12 text-center"><ReceiptText aria-hidden="true" className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No payment activity recorded</p><p className="mt-1 text-xs text-slate-500">Payment activities will appear here once recorded.</p></div>}
      </div>
      <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:justify-between sm:space-x-0 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={!activities.length} onClick={exportHistory}><Download aria-hidden="true" className="h-3.5 w-3.5" />Export History</Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={!activities.length} onClick={printHistory}><Printer aria-hidden="true" className="h-3.5 w-3.5" />Print</Button>
        </div>
        <DialogClose asChild><Button type="button" size="sm" className="min-w-20">Close</Button></DialogClose>
      </DialogFooter>
    </BookingDialogContent>
  </Dialog>
}
