import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PUBLIC_SUCCESS_STORIES_ENABLED = process.env.SUCCESS_STORIES_PUBLICATION_APPROVED === 'true'

/**
 * GET /api/success-stories
 *
 * Public endpoint to fetch published success stories
 *
 * Query Parameters:
 * - limit: Number of stories to return (default: 6, max: 50)
 * - featured_only: Return only featured stories (true/false)
 * - offset: Pagination offset (default: 0)
 *
 * Returns:
 * {
 *   stories: Array of success story objects,
 *   total: Total count of matching stories,
 *   pagination: { limit, offset, hasMore }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam), 50) : 6
    const offset = parseInt(searchParams.get('offset') || '0')
    const featuredOnly = searchParams.get('featured_only') === 'true'

    // Fail closed until an authorized content owner has reviewed the records in
    // the target environment. Admin management remains available independently.
    if (!PUBLIC_SUCCESS_STORIES_ENABLED) {
      return NextResponse.json(
        { stories: [], total: 0, pagination: { limit, offset, hasMore: false } },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
      )
    }

    const supabase = await createClient()

    // Build query for published stories only
    let query = supabase
      .from('success_stories')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .eq('status', 'approved')

    // Filter by featured if requested
    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }

    // Order by display_order (desc) then created_at (desc)
    query = query
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: stories, error, count } = await query

    if (error) {
      console.error('Error fetching success stories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch success stories' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        stories: stories || [],
        total: count || 0,
        pagination: {
          limit,
          offset,
          hasMore: count ? offset + limit < count : false,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Unexpected error in success stories API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
