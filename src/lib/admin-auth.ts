import 'server-only'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { adminSessionCookie, readAdminSession } from '@/lib/admin-session'
import { cookies } from 'next/headers'

export async function requireActiveAdmin() {
  const cookieStore = await cookies()
  const cookieSession = readAdminSession(cookieStore.get(adminSessionCookie)?.value)
  const adminClient = createAdminClient()
  if (cookieSession) {
    const { data: admin } = await adminClient.from('admins').select('id, email, role, is_active').eq('id', cookieSession.id).eq('email', cookieSession.email).eq('is_active', true).single()
    if (admin) return { admin }
  }
  const sessionClient = await createClient()
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser()

  if (userError || !user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: admin, error } = await adminClient
    .from('admins')
    .select('id, email, role, is_active')
    .eq('email', user.email.toLowerCase())
    .eq('is_active', true)
    .single()

  if (error || !admin) {
    return { response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) }
  }

  return { admin }
}
