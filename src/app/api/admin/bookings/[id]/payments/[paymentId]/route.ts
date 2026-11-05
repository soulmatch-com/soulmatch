import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentMethods, paymentRpcError } from '@/lib/payments/admin-payment-api'

const schema = z.object({
  idempotencyKey: z.string().trim().min(8).max(160),
  amount: z.number().finite().positive().max(9_999_999_999.99).multipleOf(0.01),
  method: z.enum(paymentMethods),
  externalReference: z.string().trim().max(200),
  paymentDate: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000),
  reason: z.string().trim().min(1).max(2000),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Check the payment details and provide a reason for the edit' }, { status: 400 })
  const { id, paymentId } = await params
  if (![id, paymentId].every(value => z.string().uuid().safeParse(value).success)) {
    return NextResponse.json({ error: 'Invalid booking or payment ID' }, { status: 400 })
  }
  const p = parsed.data
  const { data, error } = await createAdminClient().rpc('edit_admin_booking_payment', {
    p_booking_id: id, p_payment_id: paymentId, p_idempotency_key: p.idempotencyKey,
    p_amount: p.amount, p_method: p.method, p_external_reference: p.externalReference,
    p_payment_date: p.paymentDate, p_notes: p.notes, p_reason: p.reason,
    p_admin_id: authorization.admin.id,
  })
  if (error) return paymentRpcError(error)
  return NextResponse.json({ paymentId: data })
}
