import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const createSchema = z.object({ quotationId: z.string().uuid() })
const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(150).optional(), status: z.enum(['pending_confirmation', 'confirmed', 'planning', 'ready', 'completed', 'cancelled']).optional(), quotationId: z.string().uuid().optional() })

export async function GET(request: NextRequest) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid booking filters' }, { status: 400 })
  const { page, pageSize, search, status, quotationId } = parsed.data; const supabase = createAdminClient()
  let query = supabase.from('celebration_bookings').select('id, booking_reference, quotation_id, customer_name, ceremony_type, event_date, status, quoted_total, currency, created_at, quotations(quotation_number)', { count: 'exact' }).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  if (quotationId) query = query.eq('quotation_id', quotationId)
  if (search) query = query.or(`booking_reference.ilike.%${search.replace(/[%_,()]/g, '')}%,customer_name.ilike.%${search.replace(/[%_,()]/g, '')}%`)
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1)
  if (error) return NextResponse.json({ error: 'Unable to load bookings' }, { status: 500 })
  return NextResponse.json({ bookings: data ?? [], pagination: { page, pageSize, total: count ?? 0 } })
}

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  let body: unknown; try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = createSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: 'A valid quotation is required' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: bookingId, error } = await supabase.rpc('create_admin_booking', { p_quotation_id: parsed.data.quotationId, p_admin_id: authorization.admin.id })
  if (error) {
    if (error.code === 'P0002') return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ error: 'Unable to create booking' }, { status: 500 })
  }
  const { data: booking, error: loadError } = await supabase.from('celebration_bookings').select('*').eq('id', bookingId).maybeSingle()
  if (loadError || !booking) return NextResponse.json({ error: 'Booking was created but could not be loaded' }, { status: 500 })
  return NextResponse.json({ booking }, { status: 201 })
}
