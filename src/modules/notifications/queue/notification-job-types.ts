export const notificationJobStatuses = ['pending', 'processing', 'retry', 'sent', 'failed', 'skipped'] as const
export type NotificationJobStatus = (typeof notificationJobStatuses)[number]

export type QueueCampaignResult =
  | { status: 'queued'; campaignId: string; recipientCount: number }
  | { status: 'already_queued'; campaignId: string; recipientCount: number }
  | { status: 'no_recipients'; campaignId: string; recipientCount: 0 }
  | { status: 'not_found'; campaignId: string; recipientCount: 0 }
  | { status: 'invalid_status'; campaignId: string; recipientCount: number }
  | { status: 'unsupported_campaign'; campaignId: string; recipientCount: 0 }

// Queue membership freezes recipients for this campaign only. A future worker
// MUST re-check subscriber.status === 'subscribed' immediately before delivery.
