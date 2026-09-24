import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { CampaignDeliverySummary, NormalizedProviderEvent, ProviderEventResult } from './provider-event-types.ts'

export interface ProviderEventRepository { process(event: NormalizedProviderEvent): Promise<ProviderEventResult>; getCampaignDeliverySummary(campaignId: string): Promise<CampaignDeliverySummary> }
export class SupabaseProviderEventRepository implements ProviderEventRepository {
  private readonly db = createAdminClient()
  async process(event: NormalizedProviderEvent) {
    const { data, error } = await this.db.rpc('process_notification_provider_event', { p_provider: event.provider, p_provider_event_id: event.providerEventId, p_provider_message_id: event.providerMessageId, p_event_type: event.eventType, p_occurred_at: event.occurredAt, p_delivery_status: event.deliveryStatus, p_suppression_reason: event.suppressionReason })
    if (error || !data?.[0]) throw new Error('Provider event processing failed')
    const row = data[0]
    return { status: row.processing_status as ProviderEventResult['status'], jobId: row.job_id, campaignId: row.campaign_id }
  }
  async getCampaignDeliverySummary(campaignId: string) {
    const { data, error } = await this.db.rpc('get_notification_campaign_delivery_summary', { p_campaign_id: campaignId })
    if (error || !data?.[0]) throw new Error('Campaign delivery summary failed')
    const row = data[0]
    return { delivered: Number(row.delivered), delayed: Number(row.delayed), bounced: Number(row.bounced), complained: Number(row.complained), suppressed: Number(row.suppressed), failed: Number(row.failed) }
  }
}
