import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { QueueCampaignResult } from './notification-job-types.ts'

export interface NotificationJobRepository {
  queueCampaign(campaignId: string, queuedBy?: string): Promise<QueueCampaignResult>
  estimateCampaignRecipients(campaignId: string): Promise<number>
}

export class SupabaseNotificationJobRepository implements NotificationJobRepository {
  private readonly db = createAdminClient()

  async queueCampaign(campaignId: string, queuedBy?: string): Promise<QueueCampaignResult> {
    const { data, error } = await this.db.rpc('queue_notification_campaign', { p_campaign_id: campaignId, p_queued_by: queuedBy ?? null })
    if (error || !data?.[0]) throw new Error('Campaign queue preparation failed')
    const result = data[0]
    if (!['queued', 'already_queued', 'no_recipients', 'not_found', 'invalid_status', 'unsupported_campaign'].includes(result.status) || typeof result.campaign_id !== 'string' || typeof result.recipient_count !== 'number') {
      throw new Error('Campaign queue preparation returned an invalid result')
    }
    return { status: result.status, campaignId: result.campaign_id, recipientCount: result.recipient_count } as QueueCampaignResult
  }

  async estimateCampaignRecipients(campaignId: string): Promise<number> {
    const { data, error } = await this.db.rpc('count_notification_campaign_recipients', { p_campaign_id: campaignId })
    if (error || typeof data !== 'number' || data < 0) throw new Error('Campaign recipient estimate failed')
    return data
  }
}
