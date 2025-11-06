import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH: Update interest status (accept/decline/withdraw)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status } = await request.json()

  if (!['accepted', 'declined', 'withdrawn'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get interest to verify ownership
  const { data: interest } = await supabase
    .from('interests')
    .select('*')
    .eq('id', id)
    .single()

  if (!interest) {
    return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
  }

  // Verify user can update this interest
  const canUpdate = interest.receiver_profile_id === profile.id || interest.sender_profile_id === profile.id

  if (!canUpdate) {
    return NextResponse.json({ error: 'Not authorized to update this interest' }, { status: 403 })
  }

  // Update interest
  const { data: updatedInterest, error } = await supabase
    .from('interests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating interest:', error)
    return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 })
  }

  return NextResponse.json({ success: true, interest: updatedInterest }, { status: 200 })
}
