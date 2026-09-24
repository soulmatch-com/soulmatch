import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { JobOutcome, ClaimedNotificationJob, NotificationWorkerRepository, WorkerCampaign, WorkerSubscriber } from './notification-worker-types.ts'

export class SupabaseNotificationWorkerRepository implements NotificationWorkerRepository {
  private readonly db = createAdminClient()

  async claimJobs(batchSize: number): Promise<ClaimedNotificationJob[]> {
    const { data, error } = await this.db.rpc('claim_notification_jobs', { p_batch_size: batchSize })
    if (error) throw new Error('Notification job claim failed')
    const rows = (data ?? []) as Array<{ id: string; campaign_id: string; subscriber_id: string; channel: 'email'; attempt_count: number }>
    return rows.map((job) => ({ id: job.id, campaignId: job.campaign_id, subscriberId: job.subscriber_id, channel: job.channel, attemptCount: job.attempt_count }))
  }

  async getCampaign(campaignId: string): Promise<WorkerCampaign | null> {
    const { data, error } = await this.db.from('notification_campaigns').select('id, campaign_type, locale, channel, status, subject, preheader, headline, summary, target_url').eq('id', campaignId).maybeSingle()
    if (error) throw new Error('Campaign worker lookup failed')
    return data ? { id: data.id, campaignType: data.campaign_type, locale: data.locale, channel: data.channel, status: data.status, subject: data.subject, preheader: data.preheader, headline: data.headline, summary: data.summary, targetUrl: data.target_url } : null
  }

  async getSubscriber(subscriberId: string): Promise<WorkerSubscriber | null> {
    const { data, error } = await this.db.from('email_subscribers').select('id, email, preferred_locale, status').eq('id', subscriberId).maybeSingle()
    if (error) throw new Error('Subscriber worker lookup failed')
    return data ? { id: data.id, email: data.email, preferredLocale: data.preferred_locale, status: data.status } : null
  }

  async recordOutcome(jobId: string, outcome: JobOutcome) {
    const { error } = await this.db.rpc('record_notification_job_outcome', {
      p_job_id: jobId, p_outcome: outcome.status, p_attempt_count: outcome.attemptCount,
      p_provider_message_id: outcome.providerMessageId ?? null, p_error_code: outcome.errorCode ?? null,
      p_next_attempt_at: outcome.nextAttemptAt ?? null,
    })
    if (error) throw new Error('Notification job outcome update failed')
  }
}
