import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const statuses = ['new', 'contacted', 'follow_up', 'qualified', 'confirmed', 'completed', 'lost'] as const
const eventTypes = ['60th-marriage', '70th-marriage', '80th-marriage'] as const
const eventSessions = ['one_session', 'two_sessions'] as const
const updateSchema = z.object({
  status: z.enum(statuses).optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  requirementSummary: z.string().trim().max(2000).nullable().optional(),
  eventDate: z.string().date().nullable().optional(),
  eventType: z.enum(eventTypes).nullable().optional(),
  eventSession: z.enum(eventSessions).nullable().optional(),
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
  return NextResponse.json({ lead, notes: notes ?? [], enquiry })
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
  const update = {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.nextFollowUpAt !== undefined ? { next_follow_up_at: input.nextFollowUpAt } : {}),
    ...(input.requirementSummary !== undefined ? { requirement_summary: input.requirementSummary } : {}),
    ...(input.eventDate !== undefined ? { event_date: input.eventDate } : {}),
    ...(input.eventType !== undefined ? { event_type: input.eventType } : {}),
    ...(input.eventSession !== undefined ? { event_session: input.eventSession } : {}),
    ...(input.totalMembers !== undefined ? { total_members: input.totalMembers } : {}),
    ...(input.lostReason !== undefined ? { lost_reason: input.lostReason } : {}),
  }
  const { data, error } = await createAdminClient().from('leads').update(update).eq('id', id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to update lead' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  return NextResponse.json({ lead: data })
}
