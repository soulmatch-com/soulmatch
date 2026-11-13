import assert from 'node:assert/strict'
import test from 'node:test'
import { buildQuotationTimeline } from '../src/components/admin/quotation-activity.ts'

const quotation = { id: 'quote-a', quotation_number: 'QUOTE-A', status: 'sent', valid_until: '2099-01-01', created_at: '2026-01-01T09:00:00Z' }
const delivery = { id: 'delivery-a', recipient_name: 'Family', recipient_contact: 'family@example.test', channel: 'email', delivery_kind: 'manual', notes: 'Handed to the family', delivered_at: '2026-01-01T10:00:00Z', created_at: '2026-01-01T10:30:00Z' }
const event = { id: 'event-a', event_type: 'delivery_recorded', previous_status: null, new_status: null, metadata: { delivery_id: delivery.id }, created_at: '2026-01-01T10:30:00Z' }

test('matches deliveries by ID, avoids duplicate delivery events and orders recorded activity', () => {
  const entries = buildQuotationTimeline({ quotation, activity: [event, { ...event, id: 'duplicate-event' }, { id: 'sent', event_type: 'status_transition', previous_status: 'draft', new_status: 'sent', metadata: {}, created_at: '2026-01-01T11:00:00Z' }], deliveries: [delivery] })
  assert.deepEqual(entries.map(entry => entry.title), ['Status changed', 'Delivery recorded', 'Quotation created'])
  assert.equal(entries[1].delivery.recipient_name, 'Family')
  assert.equal(entries[1].timestamp, event.created_at)
  assert.equal(entries[0].previousStatus, 'draft')
  assert.equal(entries[0].newStatus, 'sent')
})

test('retains a delivery without an activity row and an event without delivery details', () => {
  const entries = buildQuotationTimeline({ quotation, activity: [{ ...event, metadata: { delivery_id: 'missing' } }], deliveries: [delivery] })
  assert.equal(entries.filter(entry => entry.kind === 'delivery_recorded').length, 2)
  assert.equal(entries.filter(entry => entry.delivery).length, 1)
  assert.equal(entries.find(entry => entry.delivery)?.timestamp, delivery.created_at)
})

test('shows renewed validity and does not invent a recorded event for derived expiry or missing creation data', () => {
  const entries = buildQuotationTimeline({ quotation, activity: [{ ...event, event_type: 'reopened', previous_status: 'expired', new_status: 'draft', metadata: { valid_until: '2099-02-01' } }], deliveries: [] })
  assert.equal(entries[0].renewedValidity, '2099-02-01')
  assert.equal(entries.some(entry => entry.kind === 'expired'), false)
  assert.deepEqual(buildQuotationTimeline({ quotation: { ...quotation, created_at: undefined }, activity: [], deliveries: [] }), [])
})
