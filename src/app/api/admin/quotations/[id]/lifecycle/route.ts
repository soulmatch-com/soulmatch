import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const transitionSchema = z.object({ toStatus: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled']), reopenValidUntil: z.string().date().nullable().optional() })

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params; const supabase = createAdminClient()
  const [{ data: quotation, error: quotationError }, { data: activity, error: activityError }, { data: deliveries, error: deliveriesError }] = await Promise.all([
    supabase.from('quotations').select('id, quotation_number, status, valid_until').eq('id', id).maybeSingle(),
    supabase.from('quotation_activity').select('id, event_type, previous_status, new_status, metadata, created_at, admin_id').eq('quotation_id', id).order('created_at', { ascending: false }),
    supabase.from('quotation_deliveries').select('id, recipient_name, recipient_contact, channel, delivery_kind, notes, delivered_at, created_at, recorded_by').eq('quotation_id', id).order('delivered_at', { ascending: false }),
  ])
  if (quotationError || activityError || deliveriesError) return NextResponse.json({ error: 'Unable to load quotation activity' }, { status: 500 })
  if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  const effectivelyExpired = quotation.status === 'sent' && !!quotation.valid_until && quotation.valid_until < new Date().toLocaleDateString('en-CA')
  const effectiveStatus = effectivelyExpired ? 'expired' : quotation.status
  const allowedActions: Record<string, string[]> = { draft: ['sent', 'cancelled'], sent: effectivelyExpired ? ['expired'] : ['accepted', 'rejected', 'expired', 'cancelled'], expired: ['draft'], accepted: [], rejected: [], cancelled: [] }
  return NextResponse.json({ quotation, effectiveStatus, allowedActions: allowedActions[effectiveStatus], activity: activity ?? [], deliveries: deliveries ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = transitionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the lifecycle action' }, { status: 400 })
  const supabase = createAdminClient()
  // Expiry is derived for reads so a quotation becomes unavailable without a
  // background job. Materialize that derived state immediately before reopening
  // so the audited database transition remains sent -> expired -> draft.
  if (parsed.data.toStatus === 'draft') {
    const { data: quotation } = await supabase.from('quotations').select('status,valid_until').eq('id', id).maybeSingle()
    if (quotation?.status === 'sent' && quotation.valid_until && quotation.valid_until < new Date().toLocaleDateString('en-CA')) {
      const { error: expiryError } = await supabase.rpc('transition_admin_quotation', { p_quotation_id: id, p_to_status: 'expired', p_admin_id: authorization.admin.id, p_reopen_valid_until: null })
      if (expiryError) return NextResponse.json({ error: expiryError.code === '22023' ? expiryError.message : 'Unable to change quotation status' }, { status: expiryError.code === '22023' ? 409 : 500 })
    }
  }
  const { error } = await supabase.rpc('transition_admin_quotation', { p_quotation_id: id, p_to_status: parsed.data.toStatus, p_admin_id: authorization.admin.id, p_reopen_valid_until: parsed.data.reopenValidUntil ?? null })
  if (error) return NextResponse.json({ error: error.code === '22023' ? error.message : 'Unable to change quotation status' }, { status: error.code === '22023' ? 409 : 500 })
  const { data } = await createAdminClient().from('quotations').select('*').eq('id', id).maybeSingle()
  return NextResponse.json({ quotation: data })
}
