export type PaymentSnapshot = {
  reference: string; amount: number | string; method: string | null
  external_reference: string | null; payment_date: string; notes: string | null
}

export type AuditPayment = {
  id: string; payment_reference: string; transaction_type: string; original_payment_id: string | null
  amount: number | string; currency: string; payment_method: string | null; external_reference: string | null
  payment_date: string; notes: string | null; status: string; created_at: string
}

export type PaymentActivity = {
  id: string; payment_id: string; event_type: string; created_at: string
  actor_id: string | null; actorName: string; actorEmail: string | null; actorRole: string | null
  paymentReference: string | null; payment: AuditPayment | null
  metadata: {
    amount?: number | string; currency?: string; reason?: string; original_payment_id?: string
    replacement_payment_id?: string; reversal_payment_id?: string
    previous_payment?: PaymentSnapshot; new_payment?: PaymentSnapshot
    [key: string]: unknown
  }
}

export type AuditEvent = {
  activity: PaymentActivity
  correctedReceipt?: PaymentActivity
  reversal?: PaymentActivity
}

const priority: Record<string, number> = { edited: 3, refunded: 2, reversed: 2, recorded: 1 }
export function orderAuditActivities(activities: PaymentActivity[]) {
  return [...activities].sort((a, b) =>
    Date.parse(b.created_at) - Date.parse(a.created_at)
    || (priority[b.event_type] ?? 0) - (priority[a.event_type] ?? 0)
    || b.id.localeCompare(a.id))
}

/** Group only explicit receipt/reversal relationships, never coincident timestamps. */
export function groupPaymentAudit(activities: PaymentActivity[]): AuditEvent[] {
  const ordered = orderAuditActivities(activities)
  const receipts = new Map(ordered.filter(a => a.event_type === 'recorded').map(a => [a.payment_id, a]))
  const reversals = new Map(ordered.filter(a => a.event_type === 'reversed').map(a => [a.payment_id, a]))
  const nestedIds = new Set<string>()
  const modifications = new Map<string, AuditEvent>()
  for (const activity of ordered) {
    if (activity.event_type !== 'edited') continue
    const correctedReceipt = receipts.get(activity.metadata.replacement_payment_id ?? '')
    const candidateReversal = reversals.get(activity.metadata.reversal_payment_id ?? '')
    const reversal = candidateReversal && (
      candidateReversal.payment?.original_payment_id === activity.payment_id
      || candidateReversal.metadata.original_payment_id === activity.payment_id
    ) ? candidateReversal : undefined
    if (correctedReceipt) nestedIds.add(correctedReceipt.id)
    if (reversal) nestedIds.add(reversal.id)
    modifications.set(activity.id, { activity, correctedReceipt, reversal })
  }
  return ordered.filter(a => !nestedIds.has(a.id)).map(activity => modifications.get(activity.id) ?? { activity })
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })
export function auditMoney(value: number | string | null | undefined) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? money.format(Number(value)) : 'Not available'
}
const date = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false, timeZone: 'Asia/Kolkata',
})
export function auditDate(value: string | null | undefined) {
  return value && Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : 'Not available'
}
export function auditLabel(value: string | null | undefined) {
  if (!value) return 'Not available'
  return ({ upi: 'UPI', bank_transfer: 'Bank transfer', card_external: 'Card (external)' } as Record<string, string>)[value]
    ?? value.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase())
}
export function auditTitle(type: string) {
  return ({ recorded: 'Original Payment', edited: 'Payment Modified', refunded: 'Payment Refunded', reversed: 'Payment Reversed' } as Record<string, string>)[type] ?? auditLabel(type)
}

export function auditSnapshot(activity: PaymentActivity): PaymentSnapshot | undefined {
  const payment = activity.payment
  return payment ? {
    reference: payment.payment_reference, amount: payment.amount, method: payment.payment_method,
    external_reference: payment.external_reference, payment_date: payment.payment_date, notes: payment.notes,
  } : undefined
}
export function comparisonRows(activity: PaymentActivity) {
  const before = activity.metadata.previous_payment, after = activity.metadata.new_payment
  const rows = [
    { field: 'Amount', previous: auditMoney(before?.amount), updated: auditMoney(after?.amount), changed: before && after ? Number(before.amount) !== Number(after.amount) : false },
    { field: 'Payment Method', previous: auditLabel(before?.method), updated: auditLabel(after?.method), changed: before && after ? before.method !== after.method : false },
    { field: 'External Reference', previous: before ? before.external_reference || '—' : 'Not available', updated: after ? after.external_reference || '—' : 'Not available', changed: before && after ? (before.external_reference || '') !== (after.external_reference || '') : false },
    { field: 'Payment Date', previous: auditDate(before?.payment_date), updated: auditDate(after?.payment_date), changed: before && after ? Date.parse(before.payment_date) !== Date.parse(after.payment_date) : false },
  ]
  if (before?.notes || after?.notes) rows.push({ field: 'Remarks', previous: before?.notes || '—', updated: after?.notes || '—', changed: before && after ? (before.notes || '') !== (after.notes || '') : false })
  return rows
}

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}

/** Export every independent backend audit record, including grouped child events. */
export function paymentAuditCsv(activities: PaymentActivity[], bookingReference: string | null) {
  const header = ['Booking Reference', 'Activity ID', 'Event', 'Timestamp (ISO)', 'Payment ID', 'Receipt / Transaction ID', 'Amount', 'Payment Method', 'Payment Date (ISO)', 'Administrator ID', 'Administrator Name', 'Administrator Email', 'Administrator Role', 'Previous Amount', 'Updated Amount', 'Corrected Payment ID', 'Reversal Payment ID', 'Reason', 'Audit Metadata (JSON)']
  const rows = orderAuditActivities(activities).map(a => [
    bookingReference, a.id, a.event_type, a.created_at, a.payment_id, a.paymentReference,
    a.payment?.amount ?? a.metadata.amount, a.payment?.payment_method, a.payment?.payment_date,
    a.actor_id, a.actorName, a.actorEmail, a.actorRole, a.metadata.previous_payment?.amount,
    a.metadata.new_payment?.amount, a.metadata.replacement_payment_id, a.metadata.reversal_payment_id,
    a.metadata.reason, JSON.stringify(a.metadata),
  ])
  return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')
}

const html = (value: unknown) => String(value ?? 'Not available').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const pair = (name: string, value: unknown) => `<div><dt>${html(name)}</dt><dd>${html(value)}</dd></div>`
export function paymentAuditPrintHtml(activities: PaymentActivity[], bookingReference: string | null) {
  const events = groupPaymentAudit(activities)
  const entries = events.map(({ activity: a, correctedReceipt, reversal }) => {
    const before = a.metadata.previous_payment, after = a.metadata.new_payment
    const isEdit = a.event_type === 'edited'
    const amount = isEdit ? `${auditMoney(before?.amount)} → ${auditMoney(after?.amount)}` : auditMoney(a.payment?.amount ?? a.metadata.amount)
    const details = isEdit ? `<h3>Modification Information</h3><dl>${pair('Original Receipt ID', before?.reference ?? a.paymentReference)}${pair('Corrected Receipt ID', correctedReceipt?.paymentReference ?? after?.reference)}${pair('Receipt creation status', correctedReceipt?.payment?.status ? auditLabel(correctedReceipt.payment.status) : 'Not available')}</dl>
      <table><thead><tr><th>Field</th><th>Previous Value</th><th>Updated Value</th></tr></thead><tbody>${comparisonRows(a).map(r => `<tr${r.changed ? ' class="changed"' : ''}><th>${html(r.field)}</th><td>${html(r.previous)}</td><td>${html(r.updated)}</td></tr>`).join('')}</tbody></table>
      <h3>Reversal Information</h3><dl>${pair('Reversal status', reversal ? 'Reversed' : 'Not available')}${pair('Reversal ID', reversal?.paymentReference ?? a.metadata.reversal_payment_id)}${pair('Reversal date (IST)', auditDate(reversal?.created_at))}${pair('Reversal reason', reversal?.metadata.reason ?? reversal?.payment?.notes)}${reversal?.payment?.amount !== undefined ? pair('Reversed amount', auditMoney(reversal.payment.amount)) : ''}</dl>` : `<dl>${pair('Receipt / Transaction ID', a.paymentReference)}${pair('Payment method', auditLabel(a.payment?.payment_method))}${pair('Payment date (IST)', auditDate(a.payment?.payment_date))}</dl>`
    return `<article><header><h2>${html(auditTitle(a.event_type))}</h2><span>${html(a.event_type === 'edited' ? 'Modified' : auditLabel(a.event_type))}</span></header><p class="amount">${html(amount)}</p><p>${html(auditDate(a.created_at))} IST · ${html(a.actorName)}</p>${details}<h3>Administrator Information</h3><dl>${pair('Administrator', a.actorName)}${pair('Administrator role', auditLabel(a.actorRole))}${pair('Timestamp (ISO)', a.created_at)}${pair('Reason', a.metadata.reason ?? a.payment?.notes ?? '—')}${pair('Audit event ID', a.id)}</dl></article>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>Financial Audit History — ${html(bookingReference ?? 'Booking')}</title><style>
    @page{margin:16mm}*{box-sizing:border-box}body{margin:0;font:12px/1.6 system-ui,sans-serif;color:#1e293b}h1{font-size:24px;margin:0}h2{font-size:16px;margin:0}h3{font-size:12px;margin:18px 0 8px}p{margin:4px 0 12px;color:#475569}.summary{display:flex;gap:30px;padding:14px 0;border-block:1px solid #e2e8f0;margin:20px 0}.summary b{display:block;font-size:20px}article{border:1px solid #e2e8f0;border-radius:10px;padding:18px;margin:0 0 16px;break-inside:avoid}header{display:flex;justify-content:space-between}.amount{font-size:19px;font-weight:600;color:#0f172a}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0}dt{color:#64748b}dd{margin:0;overflow-wrap:anywhere;white-space:pre-wrap}table{width:100%;border-collapse:collapse;margin:14px 0;table-layout:fixed}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;overflow-wrap:anywhere}thead{background:#f8fafc}.changed{background:#fffbeb}span{font-size:11px}footer{border-top:1px solid #e2e8f0;padding-top:12px;color:#64748b}
    </style></head><body><h1>Financial Audit History</h1><p>Complete history of payment activities, modifications and transaction changes.</p><p>Booking: ${html(bookingReference)} · All times in IST</p><section class="summary"><div>Total Activities<b>${events.length}</b></div><div>Original Payments<b>${events.filter(e => e.activity.event_type === 'recorded').length}</b></div><div>Modified Payments<b>${events.filter(e => e.activity.event_type === 'edited').length}</b></div></section>${entries || '<p>No payment activity recorded.</p>'}<footer>Complete audit details · ${activities.length} independent backend audit records retained</footer></body></html>`
}
