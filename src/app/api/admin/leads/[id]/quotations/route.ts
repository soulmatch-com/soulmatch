import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const { id } = await params
  const supabase = createAdminClient()
  const { data: lead, error: leadError } = await supabase.from('leads').select('id').eq('id', id).maybeSingle()
  if (leadError) return NextResponse.json({ error: 'Unable to load lead quotations' }, { status: 500 })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  const { data: links, error: linksError } = await supabase.from('quotation_leads').select('quotation_id').eq('lead_id', id)
  if (linksError) return NextResponse.json({ error: 'Unable to load lead quotations' }, { status: 500 })
  const ids = (links ?? []).map((link) => link.quotation_id)
  if (!ids.length) return NextResponse.json({ quotations: [] })
  const { data: quotations, error } = await supabase.from('quotations').select('id, quotation_number, status, valid_until, total_amount, created_at').in('id', ids).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Unable to load lead quotations' }, { status: 500 })
  return NextResponse.json({ quotations: quotations ?? [] })
}
