import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { expirableLeadStatuses, isPastEventDate, leadStatuses, indiaToday } from '@/lib/leads/status'
import { createAdminClient } from '@/lib/supabase/admin'

const sources = ['website', 'instagram', 'whatsapp', 'call', 'referral', 'other'] as const
const statuses = leadStatuses
const eventTypes = ['60th-marriage', '70th-marriage', '80th-marriage'] as const
const eventSessions = ['one_session', 'two_sessions'] as const

const createLeadSchema = z.object({
  source: z.enum(sources),
  contactName: z.string().trim().min(1).max(150),
  mobile: z.string().trim().min(7).max(30).optional().or(z.literal('')),
  email: z.string().trim().email().max(320).optional().or(z.literal('')),
  requirementSummary: z.string().trim().max(2000).optional().or(z.literal('')),
  eventDate: z.string().date().optional().or(z.literal('')),
  eventType: z.enum(eventTypes).optional().or(z.literal('')),
  eventSession: z.enum(eventSessions).optional().or(z.literal('')),
  totalMembers: z.coerce.number().int().min(1).max(10000).optional().or(z.literal('')),
  status: z.enum(statuses).default('new'),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  const params = request.nextUrl.searchParams
  const status = params.get('status')
  const source = params.get('source')
  const query = params.get('q')?.trim()
  const supabase = createAdminClient()

  const { error: expiryError } = await supabase.from('leads').update({ status: 'expired' }).lt('event_date', indiaToday()).in('status', expirableLeadStatuses)
  if (expiryError) {
    console.error('Unable to expire past-event leads', { code: expiryError.code, message: expiryError.message })
    return NextResponse.json({ error: 'Unable to update expired leads. Apply the expired lead status database migration first.' }, { status: 500 })
  }

  let leadsQuery = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(200)
  if (status === 'expired') leadsQuery = leadsQuery.eq('status', 'expired')
  else leadsQuery = leadsQuery.neq('status', 'expired')
  if (statuses.includes(status as (typeof statuses)[number]) && status !== 'expired') leadsQuery = leadsQuery.eq('status', status)
  if (sources.includes(source as (typeof sources)[number])) leadsQuery = leadsQuery.eq('source', source)
  if (query) {
    const safeQuery = query.replace(/[,().]/g, ' ')
    leadsQuery = leadsQuery.or(`contact_name.ilike.%${safeQuery}%,mobile.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
  }

  const { data, error } = await leadsQuery
  if (error) return NextResponse.json({ error: 'Unable to load leads' }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the lead details', details: parsed.error.flatten().fieldErrors }, { status: 400 })

  const input = parsed.data
  const supabase = createAdminClient()
  const duplicateChecks = [
    input.mobile ? supabase.from('leads').select('id, contact_name').eq('mobile', input.mobile).limit(1) : Promise.resolve({ data: [] }),
    input.email ? supabase.from('leads').select('id, contact_name').ilike('email', input.email).limit(1) : Promise.resolve({ data: [] }),
  ]
  const [mobileMatch, emailMatch] = await Promise.all(duplicateChecks)
  const existing = mobileMatch.data?.[0] ?? emailMatch.data?.[0]
  if (existing) return NextResponse.json({ error: `A lead already exists for ${existing.contact_name}`, leadId: existing.id }, { status: 409 })

  const { data, error } = await supabase.from('leads').insert({
    source: input.source,
    status: isPastEventDate(input.eventDate) ? 'expired' : input.status,
    contact_name: input.contactName,
    mobile: input.mobile || null,
    email: input.email || null,
    requirement_summary: input.requirementSummary || null,
    event_date: input.eventDate || null,
    event_type: input.eventType || null,
    event_session: input.eventSession || null,
    total_members: input.totalMembers === '' || input.totalMembers === undefined ? null : input.totalMembers,
    next_follow_up_at: input.nextFollowUpAt ?? null,
  }).select('*').single()
  if (error) return NextResponse.json({ error: 'Unable to create lead' }, { status: 500 })
  return NextResponse.json({ lead: data }, { status: 201 })
}
