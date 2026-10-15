import { NextResponse } from 'next/server'

export function paymentRpcError(error: { code?: string; message?: string }) {
  const status = error.code === 'P0002' ? 404 : error.code === '22023' || error.code === '23505' ? 409 : error.code === '42501' ? 403 : 500
  return NextResponse.json({ error: status === 500 ? 'Unable to complete payment operation' : error.message || 'Payment operation failed' }, { status })
}

export const paymentMethods = ['cash', 'upi', 'bank_transfer', 'card_external', 'other'] as const
