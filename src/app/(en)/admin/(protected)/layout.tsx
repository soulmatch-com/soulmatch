import { redirect } from 'next/navigation'

import AdminHeader from '@/components/admin/AdminHeader'
import { requireActiveAdmin } from '@/lib/admin-auth'

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader />
      <main>{children}</main>
    </div>
  )
}
