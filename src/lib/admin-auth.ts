import 'server-only'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function requireActiveAdmin() {
  const sessionClient = await createClient()
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser()

  if (userError || !user?.email) {
    return { response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
  }

  const adminClient = createAdminClient()
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
