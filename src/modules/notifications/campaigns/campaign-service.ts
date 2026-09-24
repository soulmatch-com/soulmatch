import type { CampaignRepository } from './campaign-repository.ts'
import { parseBlogCampaignRequest, parseCampaignSourceIdentity, parseCampaignSourceLookup } from './campaign-validation.ts'
import { DuplicateCampaignError, type CampaignDraft, type CreateCampaignResult } from './campaign-types.ts'

const PREHEADER_MAX_LENGTH = 160

function defaultSubject(locale: 'en' | 'ta', title: string) {
  return locale === 'ta' ? `புதிய வழிகாட்டி: ${title}` : `New Guide: ${title}`
}

function normalizePreheader(excerpt: string | null | undefined) {
  const value = excerpt?.trim()
  if (!value) return null
  return value.slice(0, PREHEADER_MAX_LENGTH)
}

export class CampaignService {
  private readonly repository: CampaignRepository
  private readonly now: () => string

  constructor(repository: CampaignRepository, now = () => new Date().toISOString()) {
    this.repository = repository
    this.now = now
  }

  async createBlogCampaignDraft(input: unknown, actorId: string): Promise<CreateCampaignResult> {
    const request = parseBlogCampaignRequest(input)
    const source = { campaignType: 'blog_publication' as const, sourceType: 'blog', sourceId: request.blogId, locale: request.locale, channel: 'email' as const }
    const existing = await this.repository.findForSource(source)
    if (existing) return { status: 'already_exists', campaignId: existing.id }

    const draft = {
      campaignType: 'blog_publication' as const, sourceType: 'blog' as const, sourceId: request.blogId,
      locale: request.locale, channel: 'email' as const, subject: defaultSubject(request.locale, request.title),
      preheader: normalizePreheader(request.excerpt), headline: request.title, summary: request.excerpt?.trim() || null,
      targetUrl: request.publicUrl, sourcePublishedAt: request.publishedAt, status: 'draft' as const, createdBy: actorId,
    }
    try {
      const created = await this.repository.createBlogPublication(draft, this.now())
      return { status: 'created', campaignId: created.id }
    } catch (error) {
      if (!(error instanceof DuplicateCampaignError)) throw error
      const concurrent = await this.repository.findForSource(source)
      if (concurrent) return { status: 'already_exists', campaignId: concurrent.id }
      throw error
    }
  }

  async getCampaignForSource(input: unknown): Promise<CampaignDraft | null> {
    return this.repository.findForSource(parseCampaignSourceLookup(input))
  }

  async getCampaignByIdForSource(campaignId: string, source: unknown): Promise<CampaignDraft | null> {
    if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return null
    return this.repository.findByIdForSource(campaignId, parseCampaignSourceIdentity(source))
  }
}
