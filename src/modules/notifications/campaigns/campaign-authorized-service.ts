import 'server-only'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { SupabaseCampaignRepository } from './campaign-repository.ts'
import { CampaignService } from './campaign-service.ts'
import type { BlogCampaignRequest, CampaignDraft, CampaignSourceIdentity, CampaignSourceLookup, CreateCampaignResult } from './campaign-types.ts'

function authorizedService() {
  return new CampaignService(new SupabaseCampaignRepository())
}

export async function createAuthorizedBlogCampaignDraft(request: BlogCampaignRequest): Promise<CreateCampaignResult> {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) throw new Error('Unauthorized campaign request.')
  return authorizedService().createBlogCampaignDraft(request, authorization.admin.id)
}

export async function getAuthorizedCampaignForSource(source: CampaignSourceLookup): Promise<CampaignDraft | null> {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) throw new Error('Unauthorized campaign request.')
  return authorizedService().getCampaignForSource(source)
}

export async function getAuthorizedCampaignPreview(campaignId: string, source: CampaignSourceIdentity): Promise<CampaignDraft | null> {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) throw new Error('Unauthorized campaign request.')
  return authorizedService().getCampaignByIdForSource(campaignId, source)
}
