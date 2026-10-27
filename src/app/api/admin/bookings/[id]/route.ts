import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; const supabase = createAdminClient()
  const [{ data: booking, error: bookingError }, { data: services, error: servicesError }, { data: activities, error: activitiesError }, { data: bookingLeads, error: leadsError }, { data: additionalQuotations, error: additionalQuotationsError }, { data: acceptedQuotations, error: acceptedQuotationsError }, { data: bookedQuotations, error: bookedQuotationsError }] = await Promise.all([
    supabase.from('celebration_bookings').select('*, quotations(id, quotation_number)').eq('id', id).maybeSingle(),
    supabase.from('celebration_booking_services').select('*').eq('booking_id', id).order('created_at'),
    supabase.from('celebration_booking_activities').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    supabase.from('celebration_booking_leads').select('lead_id, leads(id, contact_name, mobile, email, event_type, event_date)').eq('booking_id', id),
    supabase.from('celebration_booking_additional_quotations').select('quotation_id, linked_at, quotations(id, quotation_number, total_amount)').eq('booking_id', id).order('linked_at', { ascending: false }),
    supabase.from('quotations').select('id, quotation_number, total_amount').eq('status', 'accepted').order('created_at', { ascending: false }),
    supabase.from('celebration_bookings').select('quotation_id'),
  ])
  if (bookingError || servicesError || activitiesError || leadsError || additionalQuotationsError || acceptedQuotationsError || bookedQuotationsError) return NextResponse.json({ error: 'Unable to load booking details' }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  const transitions: Record<string, string[]> = { pending_confirmation: ['confirmed', 'cancelled'], confirmed: ['planning', 'cancelled'], planning: ['ready', 'cancelled'], ready: ['completed', 'cancelled'], completed: [], cancelled: [] }
  const unavailableQuotationIds = new Set([...(bookedQuotations ?? []).map((item) => item.quotation_id), ...(additionalQuotations ?? []).map((item) => item.quotation_id)])
  let eligibleAdditionalQuotations = (acceptedQuotations ?? []).filter((quotation) => !unavailableQuotationIds.has(quotation.id))
  const bookingLeadIds = (bookingLeads ?? []).map((link) => link.lead_id)
  if (bookingLeadIds.length && eligibleAdditionalQuotations.length) {
    const { data: sharedLeadLinks, error: sharedLeadLinksError } = await supabase
      .from('quotation_leads')
      .select('quotation_id')
      .in('quotation_id', eligibleAdditionalQuotations.map((quotation) => quotation.id))
      .in('lead_id', bookingLeadIds)
    if (sharedLeadLinksError) return NextResponse.json({ error: 'Unable to load eligible quotation leads' }, { status: 500 })
    const sharedLeadQuotationIds = new Set((sharedLeadLinks ?? []).map((link) => link.quotation_id))
    eligibleAdditionalQuotations = eligibleAdditionalQuotations.filter((quotation) => sharedLeadQuotationIds.has(quotation.id))
  }
  return NextResponse.json({ booking, services: services ?? [], activities: activities ?? [], leads: bookingLeads ?? [], additionalQuotations: additionalQuotations ?? [], eligibleAdditionalQuotations, allowedTransitions: transitions[booking.status] ?? [] })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params
  const { error } = await createAdminClient().rpc('delete_admin_booking', { p_booking_id: id, p_admin_id: authorization.admin.id })
  if (error?.code === 'P0002') return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (error) return NextResponse.json({ error: error.code === '22023' ? error.message : 'Unable to delete booking' }, { status: error.code === '22023' ? 409 : 500 })
  return NextResponse.json({ ok: true })
}
