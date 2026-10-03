import { redirect } from 'next/navigation'

import { AdminShell } from '@/components/admin/AdminShell'
import { requireActiveAdmin } from '@/lib/admin-auth'

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')

  return (
    <AdminShell>{children}</AdminShell>
  )
}
