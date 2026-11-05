import assert from 'node:assert/strict'
import test from 'node:test'
import { auditMoney, comparisonRows, groupPaymentAudit, paymentAuditCsv, paymentAuditPrintHtml } from '../src/lib/payments/payment-audit.ts'

const created = '2026-11-05T08:41:49.000Z'
const original = { id: 'original', payment_reference: 'RCPT-ORIGINAL', transaction_type: 'receipt', original_payment_id: null, amount: 1000, currency: 'INR', payment_method: 'upi', external_reference: 'advance', payment_date: '2026-10-15T16:54:32.000Z', notes: null, status: 'recorded', created_at: '2026-10-15T16:54:32.000Z' }
const corrected = { ...original, id: 'corrected', payment_reference: 'RCPT-CORRECTED', amount: 2000, created_at: created }
const reversed = { ...original, id: 'reversal', payment_reference: 'RVSL-CORRECTION', transaction_type: 'reversal', original_payment_id: original.id, payment_method: null, payment_date: created, created_at: created }
const snapshot = p => ({ reference: p.payment_reference, amount: p.amount, method: p.payment_method, external_reference: p.external_reference, payment_date: p.payment_date, notes: p.notes })
const activity = (id, event_type, payment, metadata = {}, timestamp = created) => ({ id, payment_id: payment.id, event_type, created_at: timestamp, actor_id: 'admin-id', actorName: 'Actual Admin', actorEmail: 'admin@local.test', actorRole: 'admin', paymentReference: payment.payment_reference, payment, metadata })
const recorded = activity('event-01', 'recorded', original, { amount: 1000 }, original.created_at)
const replacement = activity('event-02', 'recorded', corrected, { amount: 2000 })
const reversal = activity('event-03', 'reversed', reversed, { original_payment_id: original.id, amount: 1000, reason: 'Correction' })
const edited = activity('event-04', 'edited', original, { reason: 'Correction', replacement_payment_id: corrected.id, reversal_payment_id: reversed.id, previous_payment: snapshot(original), new_payment: snapshot(corrected) })
const records = [recorded, replacement, reversal, edited]

test('one correction produces exactly two top-level events without mutating backend records', () => {
  const preserved = structuredClone(records)
  const events = groupPaymentAudit(records)
  assert.deepEqual(events.map(e => e.activity.id), [edited.id, recorded.id])
  assert.equal(events[0].correctedReceipt, replacement)
  assert.equal(events[0].reversal, reversal)
  assert.deepEqual(records, preserved)
})

test('coincident timestamps do not group independent receipts, refunds or manual reversals', () => {
  const independentReceipt = activity('event-05', 'recorded', { ...original, id: 'independent' })
  const manualReversal = activity('event-06', 'reversed', { ...reversed, id: 'manual-reversal' }, { original_payment_id: original.id })
  const refund = activity('event-07', 'refunded', { ...reversed, id: 'refund', transaction_type: 'refund' })
  const events = groupPaymentAudit([...records, independentReceipt, manualReversal, refund])
  assert.equal(events.length, 5)
  for (const record of [independentReceipt, manualReversal, refund]) assert.ok(events.some(event => event.activity.id === record.id))
})

test('a chain of edits keeps one original and each distinct modification', () => {
  const final = { ...corrected, id: 'final', amount: 1500 }
  const nextReversal = { ...reversed, id: 'next-reversal', original_payment_id: corrected.id, amount: 2000 }
  const second = activity('event-08', 'edited', corrected, { replacement_payment_id: final.id, reversal_payment_id: nextReversal.id, previous_payment: snapshot(corrected), new_payment: snapshot(final) }, '2026-11-05T09:00:00.000Z')
  const events = groupPaymentAudit([...records, second, activity('event-09', 'recorded', final), activity('event-10', 'reversed', nextReversal)])
  assert.equal(events.length, 3)
  assert.deepEqual(events.map(e => e.activity.id), [second.id, edited.id, recorded.id])
})

test('ordering is deterministic when backend activities share timestamps', () => {
  const expected = groupPaymentAudit(records).map(e => e.activity.id)
  assert.deepEqual(groupPaymentAudit([...records].reverse()).map(e => e.activity.id), expected)
  assert.deepEqual(groupPaymentAudit([reversal, recorded, edited, replacement]).map(e => e.activity.id), expected)
})

test('highlight only changed values, treating numeric encodings and equivalent dates equally', () => {
  const rows = comparisonRows(edited)
  assert.deepEqual(rows.filter(r => r.changed).map(r => r.field), ['Amount'])
  assert.equal(rows.find(r => r.field === 'Payment Method').previous, 'UPI')
  const unchanged = structuredClone(edited)
  unchanged.metadata.new_payment = { ...snapshot(original), amount: '1000.00', payment_date: '2026-10-15T22:24:32+05:30' }
  assert.ok(comparisonRows(unchanged).every(r => !r.changed))
})

test('CSV exports all independent records and preserves IDs, raw timestamps and snapshots', () => {
  const csv = paymentAuditCsv(records, 'BK-EXAMPLE')
  assert.equal(csv.split('\r\n').length, 5)
  for (const record of records) assert.ok(csv.includes('"' + record.id + '"'))
  assert.ok(csv.includes(created))
  assert.ok(csv.includes('RCPT-CORRECTED'))
  const malicious = { ...edited, metadata: { ...edited.metadata, reason: '=HYPERLINK("test")' } }
  assert.ok(paymentAuditCsv([malicious], 'BK').includes('"\'=HYPERLINK'))
})

test('print output groups correction children, expands all details and escapes user content', () => {
  const document = paymentAuditPrintHtml(records, 'BK-EXAMPLE')
  assert.equal((document.match(/<article>/g) ?? []).length, 2)
  assert.ok(document.includes('Modification Information'))
  assert.ok(document.includes('RVSL-CORRECTION'))
  assert.ok(document.includes('Reversed amount'))
  const unsafe = { ...edited, metadata: { ...edited.metadata, reason: '<script>alert(1)</script>' } }
  assert.ok(!paymentAuditPrintHtml([unsafe], 'BK').includes('<script>'))
  assert.ok(paymentAuditPrintHtml([unsafe], 'BK').includes('&lt;script&gt;'))
})

test('missing actual reversal values are never fabricated from the previous payment amount', () => {
  const missing = { ...reversal, payment: null }
  assert.ok(!paymentAuditPrintHtml([recorded, replacement, missing, edited], 'BK').includes('Reversed amount'))
  assert.equal(auditMoney(undefined), 'Not available')
  assert.equal(groupPaymentAudit([]).length, 0)
})
