import { NextRequest, NextResponse } from 'next/server'

import { blogMutationErrorResponse } from '@/lib/blog/admin-blog-api'
import { updateBlog } from '@/lib/blog/admin-blog-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { blogDraftSchema, blogIdSchema } from '@/lib/validations/blog-cms.schema'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  try {
    const { id } = await params
    const blogId = blogIdSchema.parse(id)
    const body = await request.json()
    const parsed = blogDraftSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ message: 'Invalid blog details.' }, { status: 400 })

    const blog = await updateBlog(blogId, parsed.data)
    return NextResponse.json({ success: true, blog, message: 'Blog updated successfully.' })
  } catch (error) {
    return blogMutationErrorResponse(error, 'Unable to save blog.')
  }
}
