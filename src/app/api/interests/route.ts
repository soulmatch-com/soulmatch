import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch interests (sent and received)
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'sent' or 'received'

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  let query = supabase
    .from('interests')
    .select(`
      *,
      sender_profile:sender_profile_id(id, first_name, last_name, profile_photo_url, city, state, education, occupation),
      receiver_profile:receiver_profile_id(id, first_name, last_name, profile_photo_url, city, state, education, occupation)
    `)

  if (type === 'sent') {
    query = query.eq('sender_profile_id', profile.id)
  } else if (type === 'received') {
    query = query.eq('receiver_profile_id', profile.id)
  } else {
    // Return both sent and received
    query = query.or(`sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${profile.id}`)
  }

  query = query.order('created_at', { ascending: false })

  const { data: interests, error } = await query

  if (error) {
    console.error('Error fetching interests:', error)
    return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 })
  }

  return NextResponse.json({ interests }, { status: 200 })
}
