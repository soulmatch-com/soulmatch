import 'server-only'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'

export async function requireActiveAdmin() {
  const cookieStore = await cookies()
  const session = await verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)

  if (!session) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
  }

  const adminClient = createAdminClient()
  const { data: admin, error } = await adminClient
    .from('admins')
    .select('id, email, role, is_active')
    .eq('id', session.adminId)
    .eq('email', session.email.toLowerCase())
    .eq('is_active', true)
    .single()

  if (error || !admin) {
    return { response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
  }

  return { admin }
}
