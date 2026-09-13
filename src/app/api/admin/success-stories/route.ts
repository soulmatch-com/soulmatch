import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { successStorySchema } from '@/lib/validations/success-story.schema'

/**
 * GET /api/admin/success-stories
 *
 * Admin endpoint to fetch all success stories (any status)
 *
 * Query Parameters:
 * - status: Filter by status (pending|approved|rejected)
 * - featured: Filter by featured status (true|false)
 * - published: Filter by published status (true|false)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const status = searchParams.get('status')
    const featured = searchParams.get('featured')
    const published = searchParams.get('published')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('success_stories')
      .select('*', { count: 'exact' })
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (featured === 'true') {
      query = query.eq('is_featured', true)
    } else if (featured === 'false') {
      query = query.eq('is_featured', false)
    }
    if (published === 'true') {
      query = query.eq('is_published', true)
    } else if (published === 'false') {
      query = query.eq('is_published', false)
    }

    const { data: stories, error, count } = await query

    if (error) {
      console.error('Error fetching admin success stories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      stories: stories || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Unexpected error in admin success stories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/success-stories
 *
 * Admin endpoint to create a new success story
 *
 * Body: SuccessStory object (validated against schema)
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const supabase = createAdminClient()
    const body = await request.json()

    // Validate request body
    const validationResult = successStorySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Insert new success story
    const { data: newStory, error } = await supabase
      .from('success_stories')
      .insert({
        profile1_id: data.profile1_id || null,
        profile2_id: data.profile2_id || null,
        couple_names: data.couple_names,
        location: data.location,
        story_text: data.story_text,
        couple_photo_url: data.couple_photo_url || null,
        wedding_photos: data.wedding_photos || [],
        marriage_date: data.marriage_date || null,
        is_featured: data.is_featured || false,
        is_published: data.is_published || false,
        display_order: data.display_order || 0,
        submission_type: data.submission_type || 'admin',
        status: data.status || 'approved',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating success story:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: 'Success story created successfully',
        story: newStory,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error creating success story:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
