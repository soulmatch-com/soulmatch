import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ toStatus: z.enum(['pending_confirmation', 'confirmed', 'planning', 'ready', 'completed', 'cancelled']), cancellationReason: z.string().trim().min(1).max(2000).optional() }).superRefine((value, ctx) => { if (value.toStatus === 'cancelled' && !value.cancellationReason) ctx.addIssue({ code: 'custom', path: ['cancellationReason'], message: 'A cancellation reason is required' }); if (value.toStatus !== 'cancelled' && value.cancellationReason) ctx.addIssue({ code: 'custom', path: ['cancellationReason'], message: 'Only provide a cancellation reason when cancelling' }) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; let body: unknown; try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: 'Please check the lifecycle action', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  const supabase = createAdminClient(); const { error } = await supabase.rpc('transition_admin_booking', { p_booking_id: id, p_to_status: parsed.data.toStatus, p_admin_id: authorization.admin.id, p_cancellation_reason: parsed.data.cancellationReason ?? null })
  if (error) { if (error.code === 'P0002') return NextResponse.json({ error: 'Booking not found' }, { status: 404 }); return NextResponse.json({ error: error.code === '22023' ? error.message : 'Unable to change booking status' }, { status: error.code === '22023' ? 409 : 500 }) }
  const { data: booking } = await supabase.from('celebration_bookings').select('*').eq('id', id).maybeSingle()
  return NextResponse.json({ booking })
}
