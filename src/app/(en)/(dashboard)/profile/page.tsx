import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load current profile:', error)
    redirect('/dashboard')
  }

  if (!profile) {
    redirect('/profile/create')
  }

  redirect(`/profile/${profile.id}`)
}
