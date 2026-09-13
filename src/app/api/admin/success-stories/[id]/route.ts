import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { adminSuccessStoryUpdateSchema } from '@/lib/validations/success-story.schema'

/**
 * GET /api/admin/success-stories/[id]
 *
 * Fetch a single success story by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const { id } = await params
    const supabase = createAdminClient()

    const { data: story, error } = await supabase
      .from('success_stories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching success story:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ story })
  } catch (error) {
    console.error('Unexpected error fetching success story:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/success-stories/[id]
 *
 * Update a success story
 *
 * Body: Partial SuccessStory object
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    // Validate request body
    const validationResult = adminSuccessStoryUpdateSchema.safeParse({ ...body, id })
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { id: _, ...updateData } = validationResult.data

    // Update success story
    const { data: updatedStory, error } = await supabase
      .from('success_stories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating success story:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Success story updated successfully',
      story: updatedStory,
    })
  } catch (error) {
    console.error('Unexpected error updating success story:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/success-stories/[id]
 *
 * Delete a success story
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorization = await requireActiveAdmin()
    if ('response' in authorization) return authorization.response

    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('success_stories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting success story:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Success story deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error deleting success story:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
