import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  const db = createAdminClient()
  const [{ data: booking, error: bookingError }, { data: payments, error }] = await Promise.all([
    db.from('celebration_bookings').select('booking_reference').eq('id', id).maybeSingle(),
    db.from('booking_payment_records').select('id,payment_reference,transaction_type,original_payment_id,amount,currency,payment_method,external_reference,payment_date,notes,status,created_at').eq('booking_id', id),
  ])
  if (error || bookingError) return NextResponse.json({ error: 'Unable to load payment activity' }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (!payments?.length) return NextResponse.json({ bookingReference: booking.booking_reference, activities: [] })
  const { data, error: activityError } = await db.from('booking_payment_activities')
    .select('id,payment_id,event_type,actor_id,metadata,created_at,admins(name,email,role)')
    .in('payment_id', payments.map(payment => payment.id)).order('created_at', { ascending: false }).order('id', { ascending: false })
  if (activityError) return NextResponse.json({ error: 'Unable to load payment activity' }, { status: 500 })
  const records = new Map(payments.map(payment => [payment.id, payment]))
  return NextResponse.json({ bookingReference: booking.booking_reference, activities: (data ?? []).map(({ admins, ...activity }) => {
    const admin = Array.isArray(admins) ? admins[0] : admins
    const payment = records.get(activity.payment_id)
    return { ...activity, actorName: admin?.name || admin?.email || 'Administrator unavailable',
      actorEmail: admin?.email ?? null, actorRole: admin?.role ?? null,
      paymentReference: payment?.payment_reference ?? null, payment: payment ?? null }
  }) })
}
