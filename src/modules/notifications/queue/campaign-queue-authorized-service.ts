import 'server-only'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { CampaignQueueService } from './campaign-queue-service.ts'
import { SupabaseNotificationJobRepository } from './notification-job-repository.ts'

export async function queueCampaignAsAdmin(campaignId: string) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) throw new Error('Unauthorized campaign queue request.')
  return new CampaignQueueService(new SupabaseNotificationJobRepository()).prepareCampaignForDelivery(campaignId)
}
