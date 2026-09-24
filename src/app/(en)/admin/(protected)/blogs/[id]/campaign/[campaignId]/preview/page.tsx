import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'

import BlogCampaignPreview from '@/components/admin/BlogCampaignPreview'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { getBlogCampaignPreview, getBlogCampaignRecipientEstimate, getBlogCampaignDeliverySummary } from '@/lib/blog/blog-notification-campaign'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AdminBlogCampaignPreviewPage({ params }: { params: Promise<{ id: string; campaignId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')
  const { id, campaignId } = await params
  const campaign = await getBlogCampaignPreview(id, campaignId)
  if (!campaign) notFound()
  const recipientEstimate = campaign.status === 'draft' ? await getBlogCampaignRecipientEstimate(id, campaignId) : campaign.recipientCount
  let deliverySummary: Awaited<ReturnType<typeof getBlogCampaignDeliverySummary>> | null = null
  try {
    deliverySummary = await getBlogCampaignDeliverySummary(id, campaignId)
  } catch {
    // Delivery-event storage is introduced after the campaign schema. Keep the
    // protected snapshot available until the final notification migration exists.
    deliverySummary = null
  }
  return <BlogCampaignPreview blogId={id} campaign={campaign} recipientEstimate={recipientEstimate} deliverySummary={deliverySummary} />
}
