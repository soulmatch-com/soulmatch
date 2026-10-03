import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const itemSchema = z.object({ serviceId: z.string().uuid(), quantity: z.number().int().min(1).max(10000), unitPrice: z.number().finite().min(0).max(99_999_999) })
const createQuotationSchema = z.object({
  validUntil: z.string().date().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  leadIds: z.array(z.string().uuid()).max(50).default([]),
  items: z.array(itemSchema).min(1).max(100),
}).superRefine(({ items, leadIds }, context) => {
  for (const [values, path] of [[items.map((item) => item.serviceId), 'items'] as const, [leadIds, 'leadIds'] as const]) {
    if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', path: [path], message: 'Duplicate selections are not allowed.' })
  }
})

function quotationNumber() {
  return `QT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

export async function GET() {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const supabase = createAdminClient()
  const [{ data: quotations, error: quotationsError }, { data: services, error: servicesError }, { data: leads, error: leadsError }] = await Promise.all([
    supabase.from('quotations').select('*').order('created_at', { ascending: false }),
    supabase.from('celebration_services').select('id, code, name, description, display_order').eq('is_active', true).order('display_order', { ascending: true }),
    supabase.from('leads').select('id, contact_name, mobile, email').order('created_at', { ascending: false }).limit(200),
  ])
  if (quotationsError || servicesError || leadsError) return NextResponse.json({ error: 'Unable to load quotations' }, { status: 500 })
  const quotationIds = (quotations ?? []).map((quotation) => quotation.id)
  const [itemsResult, linksResult] = quotationIds.length ? await Promise.all([
    supabase.from('quotation_items').select('*').in('quotation_id', quotationIds).order('created_at', { ascending: true }),
    supabase.from('quotation_leads').select('quotation_id, lead_id').in('quotation_id', quotationIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }]
  if (itemsResult.error || linksResult.error) return NextResponse.json({ error: 'Unable to load quotation details' }, { status: 500 })
  return NextResponse.json({ quotations: quotations ?? [], items: itemsResult.data ?? [], links: linksResult.data ?? [], services: services ?? [], leads: leads ?? [] })
}

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = createQuotationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the quotation details', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  const supabase = createAdminClient()
  const [servicesResult, leadsResult] = await Promise.all([
    supabase.from('celebration_services').select('id, code, name').eq('is_active', true).in('id', parsed.data.items.map((item) => item.serviceId)),
    parsed.data.leadIds.length ? supabase.from('leads').select('id').in('id', parsed.data.leadIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (servicesResult.error || !servicesResult.data || servicesResult.data.length !== parsed.data.items.length) return NextResponse.json({ error: 'One or more selected services are no longer available' }, { status: 400 })
  if (leadsResult.error || (leadsResult.data?.length ?? 0) !== parsed.data.leadIds.length) return NextResponse.json({ error: 'One or more selected leads could not be found' }, { status: 400 })
  const servicesById = new Map(servicesResult.data.map((service) => [service.id, service]))
  const items = parsed.data.items.map((item) => {
    const service = servicesById.get(item.serviceId)!
    const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2))
    return { celebration_service_id: service.id, service_code: service.code, service_name: service.name, quantity: item.quantity, unit_price: item.unitPrice, line_total: lineTotal }
  })
  const totalAmount = Number(items.reduce((sum, item) => sum + item.line_total, 0).toFixed(2))
  const { data: quotation, error: quotationError } = await supabase.from('quotations').insert({ quotation_number: quotationNumber(), valid_until: parsed.data.validUntil ?? null, notes: parsed.data.notes || null, total_amount: totalAmount, created_by: authorization.admin.id }).select('*').single()
  if (quotationError || !quotation) return NextResponse.json({ error: 'Unable to create quotation' }, { status: 500 })
  const [createdItemsResult, linksResult] = await Promise.all([
    supabase.from('quotation_items').insert(items.map((item) => ({ ...item, quotation_id: quotation.id }))).select('*'),
    parsed.data.leadIds.length ? supabase.from('quotation_leads').insert(parsed.data.leadIds.map((leadId) => ({ quotation_id: quotation.id, lead_id: leadId }))).select('*') : Promise.resolve({ data: [], error: null }),
  ])
  if (createdItemsResult.error || linksResult.error) {
    await supabase.from('quotations').delete().eq('id', quotation.id)
    return NextResponse.json({ error: 'Unable to save quotation details' }, { status: 500 })
  }
  return NextResponse.json({ quotation, items: createdItemsResult.data ?? [], links: linksResult.data ?? [] }, { status: 201 })
}
