import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; const supabase = createAdminClient()
  const [{ data: booking, error: bookingError }, { data: services, error: servicesError }, { data: activities, error: activitiesError }, { data: bookingLeads, error: leadsError }] = await Promise.all([
    supabase.from('celebration_bookings').select('*, quotations(id, quotation_number)').eq('id', id).maybeSingle(),
    supabase.from('celebration_booking_services').select('*').eq('booking_id', id).order('created_at'),
    supabase.from('celebration_booking_activities').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('celebration_booking_leads').select('lead_id, leads(id, contact_name, mobile, email, event_type, event_date)').eq('booking_id', id),
  ])
  if (bookingError || servicesError || activitiesError || leadsError) return NextResponse.json({ error: 'Unable to load booking details' }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  const transitions: Record<string, string[]> = { pending_confirmation: ['confirmed', 'cancelled'], confirmed: ['planning', 'cancelled'], planning: ['ready', 'cancelled'], ready: ['completed', 'cancelled'], completed: [], cancelled: [] }
  return NextResponse.json({ booking, services: services ?? [], activities: activities ?? [], leads: bookingLeads ?? [], allowedTransitions: transitions[booking.status] ?? [] })
}
