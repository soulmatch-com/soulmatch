import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ body: z.string().trim().min(1).max(2000) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'A note is required' }, { status: 400 })
  const supabase = createAdminClient()
  const { data: lead } = await supabase.from('leads').select('id').eq('id', id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  const { data, error } = await supabase.from('lead_notes').insert({ lead_id: id, admin_id: authorization.admin.id, body: parsed.data.body }).select('*').single()
  if (error) return NextResponse.json({ error: 'Unable to save note' }, { status: 500 })
  return NextResponse.json({ note: data }, { status: 201 })
}
