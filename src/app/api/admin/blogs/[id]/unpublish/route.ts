import { NextRequest, NextResponse } from 'next/server'

import { blogMutationErrorResponse, localeMessage } from '@/lib/blog/admin-blog-api'
import { unpublishBlogTranslation } from '@/lib/blog/admin-blog-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { blogIdSchema, blogLocaleSchema } from '@/lib/validations/blog-cms.schema'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  try {
    const { id } = await params
    const blogId = blogIdSchema.parse(id)
    const body = await request.json()
    const locale = blogLocaleSchema.parse(body?.locale)
    const publication = await unpublishBlogTranslation(blogId, locale)
    return NextResponse.json({ success: true, publication, message: localeMessage(locale, 'unpublished') })
  } catch (error) {
    return blogMutationErrorResponse(error, 'Unable to unpublish blog.')
  }
}
