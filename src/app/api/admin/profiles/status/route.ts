import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Parse request body
    const body = await request.json()
    const { profileId, status } = body

    if (!profileId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: profileId, status' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'pending', 'suspended']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, inactive, pending, suspended' },
        { status: 400 }
      )
    }

    // Update profile status
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ profile_status: status })
      .eq('id', profileId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: `Profile status updated to ${status}`
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
