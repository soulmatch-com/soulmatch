import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { expirableLeadStatuses, isPastEventDate, leadStatuses } from '@/lib/leads/status'
import { createAdminClient } from '@/lib/supabase/admin'

const statuses = leadStatuses
const eventTypes = ['60th-marriage', '70th-marriage', '80th-marriage'] as const
const eventSessions = ['one_session', 'two_sessions'] as const
const packageTypes = ['basic', 'premium'] as const
const updateSchema = z.object({
  contactName: z.string().trim().min(1).max(150).optional(),
  mobile: z.string().trim().min(7).max(30).optional().or(z.literal('')),
  email: z.string().trim().email().max(320).optional().or(z.literal('')),
  status: z.enum(statuses).optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  requirementSummary: z.string().trim().max(2000).nullable().optional(),
  eventDate: z.string().date().nullable().optional(),
  eventEndDate: z.string().date().nullable().optional(),
  eventType: z.enum(eventTypes).nullable().optional(),
  eventSession: z.enum(eventSessions).nullable().optional(),
  packageType: z.enum(packageTypes).nullable().optional(),
  totalMembers: z.number().int().min(1).max(10000).nullable().optional(),
  lostReason: z.string().trim().max(500).nullable().optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  const supabase = createAdminClient()
  const { data: lead, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load lead' }, { status: 500 })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const [{ data: notes }, { data: enquiry }] = await Promise.all([
    supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    lead.celebration_enquiry_id ? supabase.from('celebration_enquiries').select('*').eq('id', lead.celebration_enquiry_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const { data: enquiryServices } = enquiry
    ? await supabase.from('celebration_enquiry_services').select('service_id, celebration_services(id, code, name, description)').eq('enquiry_id', enquiry.id)
    : { data: [] }
  return NextResponse.json({ lead, notes: notes ?? [], enquiry, enquiryServices: enquiryServices ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the update' }, { status: 400 })
  const input = parsed.data
  const supabase = createAdminClient()
  const { data: existing, error: existingError } = await supabase.from('leads').select('status, event_date, event_end_date, event_session').eq('id', id).maybeSingle()
  if (existingError) return NextResponse.json({ error: 'Unable to load lead' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  const nextEventDate = input.eventDate === undefined ? existing.event_date : input.eventDate
  const nextEventEndDate = input.eventEndDate === undefined ? existing.event_end_date : input.eventEndDate
  const nextEventSession = input.eventSession === undefined ? existing.event_session : input.eventSession
  if (nextEventEndDate && nextEventDate && nextEventEndDate <= nextEventDate) {
    return NextResponse.json({ error: 'The to date must be after the event date.' }, { status: 400 })
  }
  const requestedStatus = input.status ?? existing.status
  const nextStatus = isPastEventDate(nextEventDate) && expirableLeadStatuses.includes(requestedStatus as (typeof expirableLeadStatuses)[number]) ? 'expired' : input.status
  const duplicateChecks = await Promise.all([
    input.mobile ? supabase.from('leads').select('id, contact_name').eq('mobile', input.mobile).neq('id', id).limit(1) : Promise.resolve({ data: [] }),
    input.email ? supabase.from('leads').select('id, contact_name').ilike('email', input.email).neq('id', id).limit(1) : Promise.resolve({ data: [] }),
  ])
  const duplicate = duplicateChecks[0].data?.[0] ?? duplicateChecks[1].data?.[0]
  if (duplicate) return NextResponse.json({ error: `A lead already exists for ${duplicate.contact_name}`, leadId: duplicate.id }, { status: 409 })
  const update = {
    ...(input.contactName !== undefined ? { contact_name: input.contactName } : {}),
    ...(input.mobile !== undefined ? { mobile: input.mobile || null } : {}),
    ...(input.email !== undefined ? { email: input.email.toLowerCase() || null } : {}),
    ...(nextStatus !== undefined ? { status: nextStatus } : {}),
    ...(input.nextFollowUpAt !== undefined ? { next_follow_up_at: input.nextFollowUpAt } : {}),
    ...(input.requirementSummary !== undefined ? { requirement_summary: input.requirementSummary } : {}),
    ...(input.eventDate !== undefined ? { event_date: input.eventDate } : {}),
    ...(input.eventEndDate !== undefined ? { event_end_date: input.eventEndDate } : {}),
    ...(input.eventType !== undefined ? { event_type: input.eventType } : {}),
    ...(input.eventSession !== undefined ? { event_session: input.eventSession, ...(nextEventSession === 'one_session' ? { event_end_date: null } : {}) } : {}),
    ...(input.packageType !== undefined ? { package_type: input.packageType } : {}),
    ...(input.totalMembers !== undefined ? { total_members: input.totalMembers } : {}),
    ...(input.lostReason !== undefined ? { lost_reason: input.lostReason } : {}),
  }
  const { data, error } = await supabase.from('leads').update(update).eq('id', id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to update lead' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  return NextResponse.json({ lead: data })
}
