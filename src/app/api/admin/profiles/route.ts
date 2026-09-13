import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const verified = searchParams.get('verified')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('profile_status', status)
    }
    if (verified === 'true') {
      query = query.eq('is_verified', true)
    } else if (verified === 'false') {
      query = query.eq('is_verified', false)
    }

    const { data: profiles, error, count } = await query

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      profiles,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
