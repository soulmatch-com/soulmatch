import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentMethods, paymentRpcError } from '@/lib/payments/admin-payment-api'

const paymentSchema = z.object({ idempotencyKey: z.string().trim().min(8).max(160), amount: z.number().positive().finite(), currency: z.literal('INR'), method: z.enum(paymentMethods), externalReference: z.string().trim().max(200).optional(), paymentDate: z.string().datetime({ offset: true }), notes: z.string().trim().max(2000).optional() })
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; const db = createAdminClient()
  const { data, error } = await db.from('booking_payment_records').select('id,payment_reference,transaction_type,original_payment_id,amount,currency,payment_method,payment_date,created_at').eq('booking_id', id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load payments' }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  let body: unknown; try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = paymentSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: 'Please check the payment details' }, { status: 400 })
  const { id } = await params; const p = parsed.data
  const { data, error } = await createAdminClient().rpc('record_admin_booking_payment', { p_booking_id: id, p_idempotency_key: p.idempotencyKey, p_amount: p.amount, p_currency: p.currency, p_method: p.method, p_external_reference: p.externalReference ?? null, p_payment_date: p.paymentDate, p_notes: p.notes ?? null, p_admin_id: authorization.admin.id })
  if (error) return paymentRpcError(error)
  return NextResponse.json({ paymentId: data }, { status: 201 })
}
