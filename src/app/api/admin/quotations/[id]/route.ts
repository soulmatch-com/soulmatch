import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const
const itemSchema = z.object({ serviceId: z.string().uuid(), quantity: z.number().int().min(1).max(10000), unitPrice: z.number().finite().min(0).max(99_999_999) })
const updateSchema = z.object({
  status: z.enum(statuses).optional(),
  leadIds: z.array(z.string().uuid()).max(50).optional(),
  validUntil: z.string().date().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(itemSchema).min(1).max(100).optional(),
}).refine((value) => value.status !== undefined || value.leadIds !== undefined || value.validUntil !== undefined || value.notes !== undefined || value.items !== undefined, 'No update provided')

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the quotation update' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: existingQuotation, error: existingQuotationError } = await supabase.from('quotations').select('*').eq('id', id).maybeSingle()
  if (existingQuotationError) return NextResponse.json({ error: 'Unable to load quotation' }, { status: 500 })
  if (!existingQuotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  if (parsed.data.items && new Set(parsed.data.items.map((item) => item.serviceId)).size !== parsed.data.items.length) return NextResponse.json({ error: 'Duplicate services are not allowed' }, { status: 400 })
  if (parsed.data.leadIds && new Set(parsed.data.leadIds).size !== parsed.data.leadIds.length) return NextResponse.json({ error: 'Duplicate leads are not allowed' }, { status: 400 })
  if (parsed.data.leadIds) {
    const { data: leads, error: leadsError } = parsed.data.leadIds.length ? await supabase.from('leads').select('id').neq('status', 'expired').in('id', parsed.data.leadIds) : { data: [], error: null }
    if (leadsError || (leads?.length ?? 0) !== parsed.data.leadIds.length) return NextResponse.json({ error: 'One or more selected leads could not be found' }, { status: 400 })
  }
  if (parsed.data.items) {
    const { data: services, error: servicesError } = await supabase.from('celebration_services').select('id').in('id', parsed.data.items.map((item) => item.serviceId))
    if (servicesError || (services?.length ?? 0) !== parsed.data.items.length) return NextResponse.json({ error: 'One or more selected services could not be found' }, { status: 400 })
  }
  const { error: transactionError } = await supabase.rpc('update_admin_quotation', {
    p_quotation_id: id, p_status: parsed.data.status ?? null,
    p_set_valid_until: parsed.data.validUntil !== undefined, p_valid_until: parsed.data.validUntil ?? null,
    p_set_notes: parsed.data.notes !== undefined, p_notes: parsed.data.notes ?? null,
    p_replace_items: parsed.data.items !== undefined,
    p_items: parsed.data.items?.map((item) => ({ service_id: item.serviceId, quantity: item.quantity, unit_price: item.unitPrice })) ?? null,
    p_replace_leads: parsed.data.leadIds !== undefined, p_lead_ids: parsed.data.leadIds ?? [],
  })
  if (transactionError) return NextResponse.json({ error: 'Unable to update quotation' }, { status: 500 })
  const { data, error } = await supabase.from('quotations').select('*').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to load updated quotation' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  const { data: links } = await supabase.from('quotation_leads').select('quotation_id, lead_id').eq('quotation_id', id)
  return NextResponse.json({ quotation: data, links: links ?? [] })
}
