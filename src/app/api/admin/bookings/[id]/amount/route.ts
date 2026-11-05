import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const amountSchema = z.number().finite().min(0).max(9_999_999_999.99).multipleOf(0.01)
const schema = z.object({
  expectedTotal: amountSchema,
  newTotal: amountSchema,
  reason: z.string().trim().min(1).max(2000),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid amount and a reason of up to 2000 characters' }, { status: 400 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 })
  const { data, error } = await createAdminClient().rpc('alter_admin_booking_amount', {
    p_booking_id: id,
    p_expected_total: parsed.data.expectedTotal,
    p_new_total: parsed.data.newTotal,
    p_reason: parsed.data.reason,
    p_admin_id: authorization.admin.id,
  })
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '42501' ? 403 : ['22023', '40001'].includes(error.code) ? 409 : 500
    return NextResponse.json({ error: status === 500 ? 'Unable to alter booking amount' : error.message, code: status === 500 ? undefined : error.code }, { status })
  }
  return NextResponse.json({ activityId: data }, { status: 201 })
}
