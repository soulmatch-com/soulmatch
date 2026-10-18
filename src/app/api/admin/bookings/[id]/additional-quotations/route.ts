import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ quotationId: z.string().uuid() })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Choose a valid quotation' }, { status: 400 })
  const { error } = await createAdminClient().rpc('add_admin_booking_quotation', {
    p_booking_id: id,
    p_quotation_id: parsed.data.quotationId,
    p_admin_id: authorization.admin.id,
  })
  if (error?.code === 'P0002') return NextResponse.json({ error: error.message }, { status: 404 })
  if (error) return NextResponse.json({ error: error.code === '22023' ? error.message : 'Unable to add quotation to booking' }, { status: error.code === '22023' ? 409 : 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
