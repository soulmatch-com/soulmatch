import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export function paymentRpcError(error: { code?: string; message?: string }) {
  const status = error.code === 'P0002' ? 404 : error.code === '22023' || error.code === '23505' ? 409 : error.code === '42501' ? 403 : 500
  return NextResponse.json({ error: status === 500 ? 'Unable to complete payment operation' : error.message || 'Payment operation failed' }, { status })
}

export const paymentMethods = ['cash', 'upi', 'bank_transfer', 'card_external', 'other'] as const

export async function paymentAdjustmentResult(db: SupabaseClient, result: { data: string | null; error: { code?: string; message?: string } | null }, operation: {
  bookingId: string; originalPaymentId: string; transactionType: 'refund' | 'reversal'
  idempotencyKey: string; amount: number; currency: string; reason: string; paymentDate: string
}) {
  // A fully used receipt fails the RPC's balance check on replay. Recover only
  // an exact, already committed operation, including concurrent/lost responses.
  if (result.error && ['22023', '23505'].includes(result.error.code ?? '')) {
    const { data: existing } = await db.from('booking_payment_records').select('id')
      .eq('booking_id', operation.bookingId).eq('original_payment_id', operation.originalPaymentId)
      .eq('transaction_type', operation.transactionType).eq('idempotency_key', operation.idempotencyKey)
      .eq('amount', operation.amount).eq('currency', operation.currency)
      .eq('notes', operation.reason).eq('payment_date', operation.paymentDate).maybeSingle()
    if (existing) return NextResponse.json({ paymentId: existing.id }, { status: 201 })
  }
  if (result.error) return paymentRpcError(result.error)
  return NextResponse.json({ paymentId: result.data }, { status: 201 })
}
