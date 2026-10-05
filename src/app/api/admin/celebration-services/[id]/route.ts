import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  location: z.string().trim().min(1).max(120).optional(),
  displayOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'No update provided')

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the service update' }, { status: 400 })
  const input = parsed.data
  const { data, error } = await createAdminClient().from('celebration_services').update({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description || null } : {}), ...(input.icon !== undefined ? { icon: input.icon || null } : {}), ...(input.location !== undefined ? { location: input.location } : {}), ...(input.displayOrder !== undefined ? { display_order: input.displayOrder } : {}), ...(input.isActive !== undefined ? { is_active: input.isActive } : {}) }).eq('id', id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to update celebration service' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Celebration service not found' }, { status: 404 })
  return NextResponse.json({ service: data })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  const { id } = await params
  const { data, error } = await createAdminClient().from('celebration_services').delete().eq('id', id).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'Unable to delete celebration service' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Celebration service not found' }, { status: 404 })
  return NextResponse.json({ message: 'Celebration service deleted successfully' })
}
