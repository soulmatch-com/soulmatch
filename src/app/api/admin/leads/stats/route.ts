import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  const supabase = createAdminClient()
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const now = new Date().toISOString()
  const [newToday, pendingFollowUps, overdueFollowUps, confirmed] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('next_follow_up_at', 'is', null).gte('next_follow_up_at', now).in('status', ['new', 'contacted', 'follow_up', 'qualified']),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('next_follow_up_at', 'is', null).lt('next_follow_up_at', now).in('status', ['new', 'contacted', 'follow_up', 'qualified']),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
  ])
  return NextResponse.json({ newToday: newToday.count ?? 0, pendingFollowUps: pendingFollowUps.count ?? 0, overdueFollowUps: overdueFollowUps.count ?? 0, confirmed: confirmed.count ?? 0 })
}
