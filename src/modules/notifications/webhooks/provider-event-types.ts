export type ProviderDeliveryStatus = 'delivered' | 'delayed' | 'bounced' | 'complained' | 'suppressed' | 'failed'
export type ProviderEventProcessingStatus = 'processed' | 'ignored' | 'unmatched' | 'already_processed'
export type NormalizedProviderEvent = {
  provider: 'resend'
  providerEventId: string
  providerMessageId: string | null
  eventType: string
  occurredAt: string | null
  deliveryStatus: ProviderDeliveryStatus | null
  suppressionReason: 'bounce' | 'complaint' | 'provider_suppression' | null
}
export type ProviderEventResult = { status: ProviderEventProcessingStatus; jobId: string | null; campaignId: string | null }
export type CampaignDeliverySummary = { delivered: number; delayed: number; bounced: number; complained: number; suppressed: number; failed: number }
