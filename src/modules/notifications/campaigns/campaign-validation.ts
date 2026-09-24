import { z } from 'zod'
import { campaignChannels, campaignLocales, campaignTypes, type BlogCampaignRequest, type CampaignSourceIdentity, type CampaignSourceLookup } from './campaign-types.ts'

export const blogCampaignRequestSchema = z.object({
  blogId: z.string().uuid('Blog identifier is invalid.'),
  locale: z.enum(campaignLocales),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1, 'Title is required.').max(200),
  excerpt: z.string().trim().max(500).nullable().optional(),
  publicUrl: z.string().url('Public URL is invalid.').max(2048),
  publishedAt: z.string().datetime({ offset: true }),
}).strict()

export function parseBlogCampaignRequest(input: unknown): BlogCampaignRequest {
  return blogCampaignRequestSchema.parse(input)
}

export const campaignSourceLookupSchema = z.object({
  campaignType: z.enum(campaignTypes),
  sourceType: z.string().trim().min(1).max(100),
  sourceId: z.string().uuid(),
  locale: z.enum(campaignLocales),
  channel: z.enum(campaignChannels),
}).strict()

export function parseCampaignSourceLookup(input: unknown): CampaignSourceLookup {
  return campaignSourceLookupSchema.parse(input)
}

export const campaignSourceIdentitySchema = campaignSourceLookupSchema.omit({ locale: true })

export function parseCampaignSourceIdentity(input: unknown): CampaignSourceIdentity {
  return campaignSourceIdentitySchema.parse(input)
}
