import { NextRequest, NextResponse } from 'next/server'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { createBlogCampaignDraftFromPublication } from '@/lib/blog/blog-notification-campaign'
import { blogIdSchema, blogLocaleSchema } from '@/lib/validations/blog-cms.schema'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  try {
    const { id } = await params
    const blogId = blogIdSchema.parse(id)
    const body = await request.json()
    const locale = blogLocaleSchema.parse(body?.locale)
    const result = await createBlogCampaignDraftFromPublication(blogId, locale)
    return NextResponse.json(result, { status: result.status === 'created' ? 201 : 200 })
  } catch (error) {
    const message = error instanceof Error && error.message === 'Only published English or Tamil blog locales can request a campaign.'
      ? 'This translation must be published before a campaign draft can be created.'
      : error instanceof Error && error.message === 'Blog translation not found.'
        ? 'Blog translation not found.'
        : 'Unable to create campaign draft.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
