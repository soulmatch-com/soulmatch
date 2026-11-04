import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ idempotencyKey: z.string().trim().min(8).max(160), vendorAssignmentId: z.string().uuid().nullable().optional(), category: z.string().trim().min(1).max(100), amount: z.number().positive().finite(), expenseDate: z.string().date(), notes: z.string().trim().max(2000).optional() })

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  const { id } = await params; const db = createAdminClient()
  const [{ data: summary, error: summaryError }, { data: expenses, error: expensesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    db.rpc('booking_expense_summary', { p_booking_id: id }),
    db.from('booking_expense_records').select('id,expense_reference,vendor_assignment_id,category,amount,expense_date,notes,created_at,event_vendor_assignments(event_vendors(vendor_name),celebration_booking_services(service_name_snapshot))').eq('booking_id', id).order('expense_date', { ascending: false }),
    db.from('event_vendor_assignments').select('id,agreed_cost,event_vendors(vendor_name),celebration_booking_services(service_name_snapshot)').eq('booking_id', id).in('status', ['pending', 'confirmed']).order('created_at', { ascending: false }),
  ])
  if (summaryError || expensesError || assignmentsError) return NextResponse.json({ error: 'Unable to load expense tracking' }, { status: 500 })
  if (!summary?.[0]) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  return NextResponse.json({ summary: summary[0], expenses: expenses ?? [], assignments: assignments ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin(); if ('response' in authorization) return authorization.response
  let body: unknown; try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = schema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: 'Please check the expense details' }, { status: 400 })
  const { id } = await params; const p = parsed.data
  const { data, error } = await createAdminClient().rpc('record_admin_booking_expense', { p_booking_id: id, p_vendor_assignment_id: p.vendorAssignmentId ?? null, p_idempotency_key: p.idempotencyKey, p_category: p.category, p_amount: p.amount, p_expense_date: p.expenseDate, p_notes: p.notes ?? null, p_admin_id: authorization.admin.id })
  if (error) return NextResponse.json({ error: error.code === 'P0002' ? 'Booking not found' : error.message }, { status: error.code === 'P0002' ? 404 : error.code === '22023' ? 409 : 500 })
  return NextResponse.json({ expenseId: data }, { status: 201 })
}
