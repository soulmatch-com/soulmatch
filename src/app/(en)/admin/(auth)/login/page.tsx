'use server'

import { redirect } from 'next/navigation'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'
import { requireActiveAdmin } from '@/lib/admin-auth'

export default async function AdminLoginPage() {
  const authorization = await requireActiveAdmin()
  if ('admin' in authorization) redirect('/admin')

  return <AdminLoginForm />
}
