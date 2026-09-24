import { NextRequest, NextResponse } from 'next/server'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { queuePublishedBlogCampaign } from '@/lib/blog/blog-notification-campaign'
import { blogIdSchema } from '@/lib/validations/blog-cms.schema'

const campaignId = (value: string) => blogIdSchema.parse(value)

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; campaignId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  try {
    const { id, campaignId: rawCampaignId } = await params
    const result = await queuePublishedBlogCampaign(blogIdSchema.parse(id), campaignId(rawCampaignId), authorization.admin.id)
    return NextResponse.json(result, { status: result.status === 'queued' ? 200 : result.status === 'no_recipients' ? 409 : 200 })
  } catch (error) {
    const message = error instanceof Error && error.message === 'This translation must remain published before the campaign can be queued.'
      ? error.message
      : error instanceof Error && error.message === 'Only draft campaigns can be queued.'
        ? error.message
        : 'Unable to queue this campaign.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
