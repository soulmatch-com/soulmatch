import { renderBlogPublicationEmail } from '../templates/blog-email-template.ts'
import type { ActiveSuppressionChecker } from '../suppressions/suppression-types.ts'
import { getRetryDelayMs, shouldRetry } from './retry-policy.ts'
import { DEFAULT_NOTIFICATION_BATCH_SIZE, MAX_NOTIFICATION_BATCH_SIZE, type NotificationWorkerBatchResult, type NotificationWorkerRepository, type UnsubscribeUrlResolver, type WorkerEmailProvider } from './notification-worker-types.ts'

export class NotificationWorker {
  private readonly repository: NotificationWorkerRepository
  private readonly provider: WorkerEmailProvider
  private readonly unsubscribeUrls: UnsubscribeUrlResolver
  private readonly suppressions: ActiveSuppressionChecker
  private readonly now: () => Date
  private readonly from: string

  constructor(repository: NotificationWorkerRepository, provider: WorkerEmailProvider, unsubscribeUrls: UnsubscribeUrlResolver, suppressions: ActiveSuppressionChecker, now = () => new Date(), from = process.env.NOTIFICATION_EMAIL_FROM ?? '') {
    this.repository = repository
    this.provider = provider
    this.unsubscribeUrls = unsubscribeUrls
    this.suppressions = suppressions
    this.now = now
    this.from = from
  }

  async processNotificationBatch(batchSize = DEFAULT_NOTIFICATION_BATCH_SIZE): Promise<NotificationWorkerBatchResult> {
    const jobs = await this.repository.claimJobs(Math.max(1, Math.min(MAX_NOTIFICATION_BATCH_SIZE, batchSize)))
    const aggregate = { claimed: jobs.length, sent: 0, skipped: 0, retried: 0, failed: 0 }
    for (const job of jobs) {
      const outcome = await this.processJob(job)
      if (outcome === 'retry') aggregate.retried += 1
      else aggregate[outcome] += 1
    }
    return aggregate
  }

  private async processJob(job: Awaited<ReturnType<NotificationWorkerRepository['claimJobs']>>[number]): Promise<'sent' | 'skipped' | 'retry' | 'failed'> {
    const campaign = await this.repository.getCampaign(job.campaignId)
    if (!campaign || !['queued', 'processing'].includes(campaign.status) || campaign.campaignType !== 'blog_publication' || campaign.channel !== 'email' || (campaign.locale !== 'en' && campaign.locale !== 'ta')) {
      await this.repository.recordOutcome(job.id, { status: 'failed', attemptCount: job.attemptCount, errorCode: 'invalid_request' }); return 'failed'
    }
    const subscriber = await this.repository.getSubscriber(job.subscriberId)
    if (!subscriber) { await this.repository.recordOutcome(job.id, { status: 'failed', attemptCount: job.attemptCount, errorCode: 'subscriber_missing' }); return 'failed' }
    if (subscriber.status !== 'subscribed') { await this.repository.recordOutcome(job.id, { status: 'skipped', attemptCount: job.attemptCount, errorCode: 'unsubscribed' }); return 'skipped' }
    if (subscriber.preferredLocale !== campaign.locale) { await this.repository.recordOutcome(job.id, { status: 'skipped', attemptCount: job.attemptCount, errorCode: 'locale_mismatch' }); return 'skipped' }
    if (await this.suppressions.hasActiveSuppression(subscriber.id)) { await this.repository.recordOutcome(job.id, { status: 'skipped', attemptCount: job.attemptCount, errorCode: 'subscriber_suppressed' }); return 'skipped' }

    let unsubscribeUrl: string | null
    try { unsubscribeUrl = await this.unsubscribeUrls.resolve(subscriber.id, campaign.id) } catch { unsubscribeUrl = null }
    if (!unsubscribeUrl) { await this.repository.recordOutcome(job.id, { status: 'failed', attemptCount: job.attemptCount, errorCode: 'unsubscribe_unavailable' }); return 'failed' }
    const email = renderBlogPublicationEmail({ locale: campaign.locale, subject: campaign.subject, preheader: campaign.preheader, headline: campaign.headline, summary: campaign.summary, targetUrl: campaign.targetUrl }, unsubscribeUrl)
    const attemptCount = job.attemptCount + 1
    const result = await this.provider.send({ to: subscriber.email, from: this.from, subject: email.subject, html: email.html, text: email.text, idempotencyKey: job.id })
    if (result.status === 'accepted') { await this.repository.recordOutcome(job.id, { status: 'sent', attemptCount, providerMessageId: result.providerMessageId }); return 'sent' }
    if (shouldRetry(attemptCount, result.retryable)) { await this.repository.recordOutcome(job.id, { status: 'retry', attemptCount, errorCode: result.errorCode, nextAttemptAt: new Date(this.now().getTime() + getRetryDelayMs(attemptCount)).toISOString() }); return 'retry' }
    await this.repository.recordOutcome(job.id, { status: 'failed', attemptCount, errorCode: result.errorCode }); return 'failed'
  }
}
