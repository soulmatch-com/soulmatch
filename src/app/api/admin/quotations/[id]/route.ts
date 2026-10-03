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
  if (parsed.data.leadIds) {
    if (new Set(parsed.data.leadIds).size !== parsed.data.leadIds.length) return NextResponse.json({ error: 'Duplicate leads are not allowed' }, { status: 400 })
    const { data: leads, error: leadsError } = parsed.data.leadIds.length ? await supabase.from('leads').select('id').in('id', parsed.data.leadIds) : { data: [], error: null }
    if (leadsError || (leads?.length ?? 0) !== parsed.data.leadIds.length) return NextResponse.json({ error: 'One or more selected leads could not be found' }, { status: 400 })
    const { error: deleteError } = await supabase.from('quotation_leads').delete().eq('quotation_id', id)
    if (deleteError) return NextResponse.json({ error: 'Unable to update linked leads' }, { status: 500 })
    if (parsed.data.leadIds.length) {
      const { error: insertError } = await supabase.from('quotation_leads').insert(parsed.data.leadIds.map((leadId) => ({ quotation_id: id, lead_id: leadId })))
      if (insertError) return NextResponse.json({ error: 'Unable to update linked leads' }, { status: 500 })
    }
  }
  if (parsed.data.items) {
    const { data: services, error: servicesError } = await supabase.from('celebration_services').select('id, code, name').in('id', parsed.data.items.map((item) => item.serviceId))
    if (servicesError || !services || services.length !== parsed.data.items.length) return NextResponse.json({ error: 'One or more selected services could not be found' }, { status: 400 })
    const servicesById = new Map(services.map((service) => [service.id, service]))
    const items = parsed.data.items.map((item) => {
      const service = servicesById.get(item.serviceId)!
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2))
      return { quotation_id: id, celebration_service_id: service.id, service_code: service.code, service_name: service.name, quantity: item.quantity, unit_price: item.unitPrice, line_total: lineTotal }
    })
    const { error: deleteItemsError } = await supabase.from('quotation_items').delete().eq('quotation_id', id)
    if (deleteItemsError) return NextResponse.json({ error: 'Unable to update quotation items' }, { status: 500 })
    const { error: insertItemsError } = await supabase.from('quotation_items').insert(items)
    if (insertItemsError) return NextResponse.json({ error: 'Unable to update quotation items' }, { status: 500 })
  }
  const update = {
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.validUntil !== undefined ? { valid_until: parsed.data.validUntil } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
    ...(parsed.data.items ? { total_amount: Number(parsed.data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)) } : {}),
  }
  const { data, error } = Object.keys(update).length === 0 ? { data: existingQuotation, error: null } : await supabase.from('quotations').update(update).eq('id', id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to update quotation' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  const { data: links } = await supabase.from('quotation_leads').select('quotation_id, lead_id').eq('quotation_id', id)
  return NextResponse.json({ quotation: data, links: links ?? [] })
}
