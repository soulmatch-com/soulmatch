// Admin API - Get all users
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        *,
        user_id
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: profiles, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { message: 'Failed to fetch users', error: error.message },
        { status: 500 }
      )
    }

    // Get auth users data
    const userIds = profiles?.map(p => p.user_id) || []
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
    }

    // Merge profile and auth data
    const usersWithAuth = profiles?.map(profile => {
      const authUser = users?.find(u => u.id === profile.user_id)
      return {
        ...profile,
        email: authUser?.email || 'N/A',
        auth_created_at: authUser?.created_at,
        last_sign_in_at: authUser?.last_sign_in_at,
      }
    })

    return NextResponse.json({
      users: usersWithAuth || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
