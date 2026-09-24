import 'server-only'

import type { BlogCampaignRequest, CampaignLocale } from '@/modules/notifications/campaigns/campaign-types'
import { createAuthorizedBlogCampaignDraft, getAuthorizedCampaignForSource, getAuthorizedCampaignPreview } from '@/modules/notifications/campaigns/campaign-authorized-service'
import { CampaignQueueService } from '@/modules/notifications/queue/campaign-queue-service'
import { SupabaseNotificationJobRepository } from '@/modules/notifications/queue/notification-job-repository'
import { SupabaseProviderEventRepository } from '@/modules/notifications/webhooks/provider-event-repository'
import { getAdminBlogById } from './admin-blog-repository'

export type BlogCampaignSource = {
  id: string
  locale: CampaignLocale
  slug: string
  title: string
  excerpt?: string | null
  publishedAt: string
  status: 'draft' | 'published'
}

export function buildPublishedBlogCampaignRequest(source: BlogCampaignSource): BlogCampaignRequest {
  if (source.status !== 'published' || (source.locale !== 'en' && source.locale !== 'ta')) throw new Error('Only published English or Tamil blog locales can request a campaign.')
  return {
    blogId: source.id,
    locale: source.locale,
    slug: source.slug,
    title: source.title,
    excerpt: source.excerpt ?? null,
    publicUrl: source.locale === 'en' ? `https://mythirumanam.in/blog/${source.slug}` : `https://mythirumanam.in/ta/blog/${source.slug}`,
    publishedAt: source.publishedAt,
  }
}

export async function requestPublishedBlogCampaignDraft(source: BlogCampaignSource) {
  return createAuthorizedBlogCampaignDraft(buildPublishedBlogCampaignRequest(source))
}

const campaignSource = (blogId: string, locale: CampaignLocale) => ({
  campaignType: 'blog_publication' as const,
  sourceType: 'blog',
  sourceId: blogId,
  locale,
  channel: 'email' as const,
})

export async function getBlogCampaignStatus(blogId: string, locale: CampaignLocale) {
  return getAuthorizedCampaignForSource(campaignSource(blogId, locale))
}

export async function createBlogCampaignDraftFromPublication(blogId: string, locale: CampaignLocale) {
  const blog = await getAdminBlogById(blogId)
  const translation = locale === 'en' ? blog.english : blog.tamil
  if (!translation) throw new Error('Blog translation not found.')
  return requestPublishedBlogCampaignDraft({
    id: blog.post.id,
    locale,
    slug: blog.post.slug,
    title: translation.title,
    excerpt: translation.excerpt,
    publishedAt: translation.published_at ?? blog.post.published_at ?? '',
    status: translation.status,
  })
}

export async function getBlogCampaignPreview(blogId: string, campaignId: string) {
  return getAuthorizedCampaignPreview(campaignId, { campaignType: 'blog_publication', sourceType: 'blog', sourceId: blogId, channel: 'email' })
}

function queueService() {
  return new CampaignQueueService(new SupabaseNotificationJobRepository())
}

async function requirePublishedCampaignSource(blogId: string, campaignId: string) {
  const campaign = await getBlogCampaignPreview(blogId, campaignId)
  if (!campaign) throw new Error('Campaign not found for this blog.')
  const blog = await getAdminBlogById(blogId)
  const translation = campaign.locale === 'en' ? blog.english : blog.tamil
  if (!translation || translation.status !== 'published') throw new Error('This translation must remain published before the campaign can be queued.')
  return campaign
}

export async function getBlogCampaignRecipientEstimate(blogId: string, campaignId: string) {
  const campaign = await requirePublishedCampaignSource(blogId, campaignId)
  if (campaign.status !== 'draft') return campaign.recipientCount
  return queueService().estimateCampaignRecipients(campaign.id)
}

export async function getBlogCampaignDeliverySummary(blogId: string, campaignId: string) {
  const campaign = await getBlogCampaignPreview(blogId, campaignId)
  if (!campaign) throw new Error('Campaign not found for this blog.')
  return new SupabaseProviderEventRepository().getCampaignDeliverySummary(campaign.id)
}

export async function queuePublishedBlogCampaign(blogId: string, campaignId: string, actorId: string) {
  const campaign = await requirePublishedCampaignSource(blogId, campaignId)
  if (campaign.status !== 'draft' && campaign.status !== 'queued') throw new Error('Only draft campaigns can be queued.')
  return queueService().prepareCampaignForDelivery(campaign.id, actorId)
}
