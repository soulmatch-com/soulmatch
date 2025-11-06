import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch user notifications
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  let query = supabase
    .from('notifications')
    .select(`
      *,
      related_profile:related_profile_id(id, first_name, last_name, profile_photo_url)
    `)
    .eq('user_id', user.id)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  query = query.order('created_at', { ascending: false }).limit(50)

  const { data: notifications, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  return NextResponse.json({ notifications }, { status: 200 })
}
