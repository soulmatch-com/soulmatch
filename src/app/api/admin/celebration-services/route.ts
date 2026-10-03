import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const serviceSchema = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  location: z.string().trim().min(1).max(120),
  displayOrder: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
})

const parsePositiveInteger = (value: string | null, fallback: number, maximum: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback
}

export async function GET(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  const searchParams = request.nextUrl.searchParams
  const page = parsePositiveInteger(searchParams.get('page'), 1, 100000)
  const limit = parsePositiveInteger(searchParams.get('limit'), 10, 100)
  const search = searchParams.get('search')?.trim().slice(0, 150)
  const location = searchParams.get('location')?.trim().slice(0, 120)
  const status = searchParams.get('status')
  const offset = (page - 1) * limit

  let query = createAdminClient()
    .from('celebration_services')
    .select('*', { count: 'exact' })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true })

  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`)
  if (location) query = query.ilike('location', `%${location}%`)
  if (status === 'active') query = query.eq('is_active', true)
  if (status === 'inactive') query = query.eq('is_active', false)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: 'Unable to load celebration services' }, { status: 500 })
  const total = count ?? 0
  return NextResponse.json({
    services: data ?? [],
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Please check the service details', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  const input = parsed.data
  const { data, error } = await createAdminClient().from('celebration_services').insert({ code: input.code, name: input.name, description: input.description || null, icon: input.icon || null, location: input.location, display_order: input.displayOrder, is_active: input.isActive }).select('*').single()
  if (error?.code === '23505') return NextResponse.json({ error: 'A service with this code already exists' }, { status: 409 })
  if (error || !data) return NextResponse.json({ error: 'Unable to create celebration service' }, { status: 500 })
  return NextResponse.json({ service: data }, { status: 201 })
}
