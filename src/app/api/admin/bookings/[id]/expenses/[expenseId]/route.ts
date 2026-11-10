import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  vendorAssignmentId: z.string().uuid().nullable(),
  category: z.string().trim().min(1).max(100),
  amount: z.number().finite().positive().max(9_999_999_999.99).multipleOf(0.01),
  expenseDate: z.string().date(),
  notes: z.string().trim().max(2000),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id, expenseId } = await params
  if (![id, expenseId].every(value => z.string().uuid().safeParse(value).success)) {
    return NextResponse.json({ error: 'Invalid booking or expense ID' }, { status: 400 })
  }
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the expense details' }, { status: 400 })
  const p = parsed.data
  const { data, error } = await createAdminClient().rpc('edit_admin_booking_expense', {
    p_booking_id: id, p_expense_id: expenseId, p_vendor_assignment_id: p.vendorAssignmentId,
    p_category: p.category, p_amount: p.amount, p_expense_date: p.expenseDate,
    p_notes: p.notes, p_admin_id: authorization.admin.id,
  })
  if (error) return NextResponse.json({ error: error.message }, {
    status: error.code === 'P0002' ? 404 : error.code === '22023' ? 409 : error.code === '42501' ? 403 : 500,
  })
  return NextResponse.json({ expenseId: data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id, expenseId } = await params
  if (![id, expenseId].every(value => z.string().uuid().safeParse(value).success)) {
    return NextResponse.json({ error: 'Invalid booking or expense ID' }, { status: 400 })
  }
  const { data, error } = await createAdminClient().rpc('delete_admin_booking_expense', {
    p_booking_id: id, p_expense_id: expenseId, p_admin_id: authorization.admin.id,
  })
  if (error) return NextResponse.json({ error: error.message }, {
    status: error.code === 'P0002' ? 404 : error.code === '22023' ? 409 : error.code === '42501' ? 403 : 500,
  })
  return NextResponse.json({ expenseId: data })
}
