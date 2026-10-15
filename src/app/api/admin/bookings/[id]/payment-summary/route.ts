import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; const { data, error } = await createAdminClient().rpc('booking_payment_summary', { p_booking_id: id })
  if (error) return NextResponse.json({ error: 'Unable to load payment summary' }, { status: 500 })
  if (!data?.[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json({ summary: data[0] })
}
