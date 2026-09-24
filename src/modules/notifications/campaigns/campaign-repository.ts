import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import { DuplicateCampaignError, type CampaignDraft, type CampaignSourceIdentity, type CampaignSourceLookup } from './campaign-types.ts'

type CampaignRow = Database['public']['Tables']['notification_campaigns']['Row']

export interface CampaignRepository {
  findForSource(source: CampaignSourceLookup): Promise<CampaignDraft | null>
  findByIdForSource(campaignId: string, source: CampaignSourceIdentity): Promise<CampaignDraft | null>
  createBlogPublication(draft: Omit<CampaignDraft, 'id' | 'createdAt' | 'updatedAt' | 'queuedBy' | 'queuedAt' | 'completedAt' | 'recipientCount' | 'sentCount' | 'failedCount' | 'skippedCount'>, timestamp: string): Promise<CampaignDraft>
}

function toCampaignDraft(row: CampaignRow): CampaignDraft {
  return {
    id: row.id, campaignType: row.campaign_type, sourceType: 'blog', sourceId: row.source_id,
    locale: row.locale!, channel: row.channel, subject: row.subject,
    preheader: row.preheader, headline: row.headline, summary: row.summary, targetUrl: row.target_url, sourcePublishedAt: row.source_published_at,
    status: row.status, createdBy: row.created_by, queuedBy: row.queued_by, createdAt: row.created_at, updatedAt: row.updated_at,
    queuedAt: row.queued_at, completedAt: row.completed_at, recipientCount: row.recipient_count,
    sentCount: row.sent_count, failedCount: row.failed_count, skippedCount: row.skipped_count,
  }
}

export class SupabaseCampaignRepository implements CampaignRepository {
  private readonly db = createAdminClient()

  async findForSource(source: CampaignSourceLookup) {
    const { data, error } = await this.db.from('notification_campaigns').select('*')
      .eq('campaign_type', source.campaignType).eq('source_type', source.sourceType).eq('source_id', source.sourceId)
      .eq('locale', source.locale).eq('channel', source.channel).maybeSingle()
    if (error) throw new Error('Campaign lookup failed')
    return data ? toCampaignDraft(data) : null
  }

  async findByIdForSource(campaignId: string, source: CampaignSourceIdentity) {
    const { data, error } = await this.db.from('notification_campaigns').select('*').eq('id', campaignId)
      .eq('campaign_type', source.campaignType).eq('source_type', source.sourceType).eq('source_id', source.sourceId)
      .eq('channel', source.channel).maybeSingle()
    if (error) throw new Error('Campaign lookup failed')
    return data ? toCampaignDraft(data) : null
  }

  async createBlogPublication(draft: Omit<CampaignDraft, 'id' | 'createdAt' | 'updatedAt' | 'queuedBy' | 'queuedAt' | 'completedAt' | 'recipientCount' | 'sentCount' | 'failedCount' | 'skippedCount'>, timestamp: string) {
    const { data, error } = await this.db.from('notification_campaigns').insert({
      campaign_type: draft.campaignType, source_type: draft.sourceType, source_id: draft.sourceId,
      locale: draft.locale, channel: draft.channel, subject: draft.subject, preheader: draft.preheader,
      headline: draft.headline, summary: draft.summary, target_url: draft.targetUrl, source_published_at: draft.sourcePublishedAt, status: 'draft',
      created_by: draft.createdBy, created_at: timestamp, updated_at: timestamp,
    }).select('*').single()
    if (error?.code === '23505') throw new DuplicateCampaignError('Campaign already exists')
    if (error || !data) throw new Error('Campaign creation failed')
    return toCampaignDraft(data)
  }
}
