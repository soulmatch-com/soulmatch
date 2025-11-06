import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { receiver_profile_id, message } = await request.json()

  if (!receiver_profile_id) {
    return NextResponse.json({ error: 'receiver_profile_id is required' }, { status: 400 })
  }

  // Get sender's profile
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!senderProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Prevent self-interest
  if (senderProfile.id === receiver_profile_id) {
    return NextResponse.json({ error: 'Cannot send interest to yourself' }, { status: 400 })
  }

  // Check if interest already exists
  const { data: existingInterest } = await supabase
    .from('interests')
    .select('*')
    .eq('sender_profile_id', senderProfile.id)
    .eq('receiver_profile_id', receiver_profile_id)
    .single()

  if (existingInterest) {
    return NextResponse.json({ error: 'Interest already sent' }, { status: 400 })
  }

  // Create interest
  const { data: interest, error } = await supabase
    .from('interests')
    .insert({
      sender_profile_id: senderProfile.id,
      receiver_profile_id,
      message,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating interest:', error)
    return NextResponse.json({ error: 'Failed to send interest' }, { status: 500 })
  }

  return NextResponse.json({ success: true, interest }, { status: 201 })
}
