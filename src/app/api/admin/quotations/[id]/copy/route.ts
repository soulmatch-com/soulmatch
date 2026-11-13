import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  const { id } = await params
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid quotation ID' }, { status: 400 })

  const supabase = createAdminClient()
  const quotationNumber = `QT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const { data: quotationId, error } = await supabase.rpc('copy_admin_quotation', {
    p_source_quotation_id: id,
    p_quotation_number: quotationNumber,
    p_admin_id: authorization.admin.id,
  })
  if (error || !quotationId) {
    const status = error?.code === 'P0002' ? 404 : error?.code === '22023' ? 409 : 500
    return NextResponse.json({ error: status === 500 ? 'Unable to copy quotation' : error?.message }, { status })
  }
  return NextResponse.json({ quotationId }, { status: 201 })
}
