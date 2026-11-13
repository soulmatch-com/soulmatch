import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentAdjustmentResult } from '@/lib/payments/admin-payment-api'

const schema = z.object({
  idempotencyKey: z.string().trim().min(8).max(160), amount: z.number().positive().finite(),
  currency: z.literal('INR'), reason: z.string().trim().min(1).max(2000), paymentDate: z.string().datetime({ offset: true }),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the refund details' }, { status: 400 })
  const { id, paymentId } = await params
  const value = parsed.data, db = createAdminClient()
  const result = await db.rpc('record_admin_booking_payment_refund', {
    p_booking_id: id, p_original_payment_id: paymentId, p_idempotency_key: value.idempotencyKey,
    p_amount: value.amount, p_currency: value.currency, p_reason: value.reason,
    p_payment_date: value.paymentDate, p_admin_id: authorization.admin.id,
  })
  return paymentAdjustmentResult(db, result, { ...value, bookingId: id, originalPaymentId: paymentId, transactionType: 'refund' })
}
