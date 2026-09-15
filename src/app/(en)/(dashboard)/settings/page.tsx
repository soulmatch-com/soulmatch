import { createClient } from '@/lib/supabase/server'
import { PasswordUpdateForm } from '@/components/settings/PasswordUpdateForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-950">Update Password</h1>
        <p className="mt-2 text-slate-600">{user?.email || 'Manage your account password'}</p>
      </div>

      <div className="space-y-6">
        <PasswordUpdateForm />
      </div>
    </div>
  )
}
