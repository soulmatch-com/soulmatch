import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
const schema = z.object({ recipientName: z.string().trim().min(1).max(150), recipientContact: z.string().trim().min(1).max(320), channel: z.enum(['email', 'whatsapp', 'manual']), notes: z.string().trim().max(2000).nullable().optional() })
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: 'Please check the delivery details' }, { status: 400 })
  const { data, error } = await createAdminClient().rpc('record_admin_quotation_delivery', { p_quotation_id: id, p_recipient_name: parsed.data.recipientName, p_recipient_contact: parsed.data.recipientContact, p_channel: parsed.data.channel, p_notes: parsed.data.notes ?? null, p_admin_id: authorization.admin.id })
  if (error || !data) return NextResponse.json({ error: 'Unable to record manual delivery' }, { status: 500 })
  return NextResponse.json({ deliveryId: data }, { status: 201 })
}
