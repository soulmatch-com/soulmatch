import { NextRequest, NextResponse } from 'next/server'

import { blogMutationErrorResponse } from '@/lib/blog/admin-blog-api'
import { createBlogDraft } from '@/lib/blog/admin-blog-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { blogDraftSchema } from '@/lib/validations/blog-cms.schema'

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  try {
    const body = await request.json()
    const parsed = blogDraftSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ message: 'Invalid blog details.' }, { status: 400 })

    const blog = await createBlogDraft(parsed.data)
    return NextResponse.json({ success: true, blogId: blog.id, message: 'Draft saved successfully.' }, { status: 201 })
  } catch (error) {
    return blogMutationErrorResponse(error, 'Unable to save blog.')
  }
}
