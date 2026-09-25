export const campaignTypes = ['blog_publication'] as const
export const campaignChannels = ['email'] as const
export const campaignStatuses = ['draft', 'queued', 'processing', 'completed', 'partially_failed', 'failed', 'cancelled'] as const
export const campaignLocales = ['en', 'ta'] as const

export type CampaignType = (typeof campaignTypes)[number]
export type CampaignChannel = (typeof campaignChannels)[number]
export type CampaignStatus = (typeof campaignStatuses)[number]
export type CampaignLocale = (typeof campaignLocales)[number]

export type BlogCampaignRequest = {
  blogId: string
  locale: CampaignLocale
  slug: string
  title: string
  excerpt?: string | null
  publicUrl: string
  publishedAt: string
}

export type CampaignSourceLookup = {
  campaignType: CampaignType
  sourceType: string
  sourceId: string
  locale: CampaignLocale
  channel: CampaignChannel
}

export type CampaignSourceIdentity = Omit<CampaignSourceLookup, 'locale'>

export type CampaignDraft = CampaignSourceLookup & {
  id: string
  subject: string
  preheader: string | null
  headline: string
  summary: string | null
  targetUrl: string
  sourcePublishedAt: string
  status: CampaignStatus
  createdBy: string | null
  queuedBy: string | null
  createdAt: string
  updatedAt: string
  queuedAt: string | null
  completedAt: string | null
  recipientCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
}

export type CreateCampaignResult = { status: 'created' | 'already_exists'; campaignId: string }

export class DuplicateCampaignError extends Error {}
