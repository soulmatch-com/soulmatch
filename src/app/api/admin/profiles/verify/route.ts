import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Parse request body
    const body = await request.json()
    const { profileId, verified } = body

    if (!profileId || typeof verified !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: profileId, verified' },
        { status: 400 }
      )
    }

    // Update profile verification status
    const updateData: any = {
      is_verified: verified,
      verified_at: verified ? new Date().toISOString() : null,
    }

    // Only set verified_by if verifying (don't set it when unverifying)
    if (verified) {
      // Leave verified_by as null for now since we don't have admin user tracking
      // You can add admin user ID here when admin auth is properly implemented
      updateData.verified_by = null
    } else {
      updateData.verified_by = null
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile verification:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: verified ? 'Profile verified successfully' : 'Profile verification removed'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
