import type { NotificationJobRepository } from './notification-job-repository.ts'
import type { QueueCampaignResult } from './notification-job-types.ts'

export class CampaignQueueService {
  private readonly repository: NotificationJobRepository

  constructor(repository: NotificationJobRepository) {
    this.repository = repository
  }

  async prepareCampaignForDelivery(campaignId: string, queuedBy?: string): Promise<QueueCampaignResult> {
    if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return { status: 'not_found', campaignId, recipientCount: 0 }
    return this.repository.queueCampaign(campaignId, queuedBy)
  }

  async estimateCampaignRecipients(campaignId: string): Promise<number> {
    if (!/^[0-9a-f-]{36}$/i.test(campaignId)) return 0
    return this.repository.estimateCampaignRecipients(campaignId)
  }
}
