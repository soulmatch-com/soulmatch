import type { EmailSendResult } from '../providers/email-provider.ts'

export const DEFAULT_NOTIFICATION_BATCH_SIZE = 25
export const MAX_NOTIFICATION_BATCH_SIZE = 50

export type NotificationWorkerBatchResult = {
  claimed: number
  sent: number
  skipped: number
  retried: number
  failed: number
}

export type NotificationBatchProcessor = {
  processNotificationBatch(batchSize?: number): Promise<NotificationWorkerBatchResult>
}

export type ClaimedNotificationJob = { id: string; campaignId: string; subscriberId: string; channel: 'email'; attemptCount: number }
export type WorkerCampaign = { id: string; campaignType: 'blog_publication'; locale: 'en' | 'ta' | null; channel: 'email'; status: 'queued' | 'processing' | 'completed' | 'partially_failed' | 'failed' | 'cancelled' | 'draft'; subject: string; preheader: string | null; headline: string; summary: string | null; targetUrl: string }
export type WorkerSubscriber = { id: string; email: string; preferredLocale: 'en' | 'ta' | null; status: 'subscribed' | 'unsubscribed' }
export type JobOutcome = { status: 'sent' | 'skipped' | 'failed' | 'retry'; attemptCount: number; providerMessageId?: string | null; errorCode?: string | null; nextAttemptAt?: string | null }
export type NotificationWorkerRepository = {
  claimJobs(batchSize: number): Promise<ClaimedNotificationJob[]>
  getCampaign(campaignId: string): Promise<WorkerCampaign | null>
  getSubscriber(subscriberId: string): Promise<WorkerSubscriber | null>
  recordOutcome(jobId: string, outcome: JobOutcome): Promise<void>
}
export type UnsubscribeUrlResolver = { resolve(subscriberId: string, campaignId: string): Promise<string | null> }
export type WorkerEmailProvider = { send(message: Parameters<import('../providers/email-provider.ts').EmailProvider['send']>[0]): Promise<EmailSendResult> }
