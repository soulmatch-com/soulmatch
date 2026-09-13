// Admin API - Get, Update, or Delete specific user
import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const supabase = createAdminClient()
    const { id: userId } = await params

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Get auth data
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId)

    return NextResponse.json({
      user: {
        ...profile,
        email: user?.email || 'N/A',
        auth_created_at: user?.created_at,
        last_sign_in_at: user?.last_sign_in_at,
      },
    })
  } catch (error) {
    console.error('Admin get user error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update user status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const supabase = createAdminClient()
    const { id: userId } = await params
    const body = await request.json()
    const { profile_status, is_verified } = body

    const updates: any = {}

    if (profile_status) {
      updates.profile_status = profile_status
    }

    if (typeof is_verified === 'boolean') {
      updates.is_verified = is_verified
      if (is_verified) {
        updates.verified_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update user', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: data,
    })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const supabase = createAdminClient()
    const { id: userId } = await params

    // Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)

    if (profileError) {
      return NextResponse.json(
        { message: 'Failed to delete profile', error: profileError.message },
        { status: 500 }
      )
    }

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Failed to delete auth user:', authError)
    }

    return NextResponse.json({
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
