import 'server-only'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  celebrationEnquiryStatusUpdateSchema,
  type CelebrationEnquiryStatus,
} from '@/lib/validations/celebration-enquiry-status.schema'

type StatusUpdateRpcRow = {
  enquiry_id: string
  status: CelebrationEnquiryStatus
  status_updated_at: string
  history_id: string
}

export class CelebrationEnquiryStatusError extends Error {
  constructor(
    public readonly code:
      | 'UNAUTHORIZED'
      | 'VALIDATION_ERROR'
      | 'NO_STATUS_CHANGE'
      | 'NOT_FOUND'
      | 'UPDATE_FAILED',
    message: string
  ) {
    super(message)
    this.name = 'CelebrationEnquiryStatusError'
  }
}

export async function updateCelebrationEnquiryStatus(input: unknown) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) {
    throw new CelebrationEnquiryStatusError('UNAUTHORIZED', 'Admin authorization is required')
  }

  const validation = celebrationEnquiryStatusUpdateSchema.safeParse(input)
  if (!validation.success) {
    throw new CelebrationEnquiryStatusError('VALIDATION_ERROR', 'Please check the status update details')
  }

  const client = createAdminClient()
  const { data, error } = await client.rpc('update_celebration_enquiry_status', {
    p_enquiry_id: validation.data.enquiryId,
    p_new_status: validation.data.status,
    p_remarks: validation.data.remarks,
    p_changed_by: authorization.admin.id,
  })

  if (error) {
    if (error.message?.includes('No status change detected')) {
      throw new CelebrationEnquiryStatusError('NO_STATUS_CHANGE', 'No status change detected.')
    }
    if (error.message?.includes('not found')) {
      throw new CelebrationEnquiryStatusError('NOT_FOUND', 'Celebration enquiry not found')
    }

    console.error('Celebration enquiry status update failed', {
      code: error.code,
      type: error.name,
    })
    throw new CelebrationEnquiryStatusError('UPDATE_FAILED', 'Unable to update the enquiry status right now')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new CelebrationEnquiryStatusError('UPDATE_FAILED', 'Unable to update the enquiry status right now')
  }

  return row as StatusUpdateRpcRow
}
