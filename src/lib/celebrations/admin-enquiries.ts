import 'server-only'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  applyCelebrationEnquiriesListQuery,
  applyUpcomingCelebrationEventsQuery,
  CelebrationEnquiriesListError,
  normalizeCelebrationEnquiriesListParams,
  type CelebrationEnquiryListRow,
  type CelebrationEnquiryQueryBuilder,
  type UpcomingCelebrationEventRow,
} from './admin-enquiries-core'

export * from './admin-enquiries-core'

export async function getCelebrationEnquiries(input: Record<string, string | string[] | undefined> = {}) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) {
    throw new CelebrationEnquiriesListError('UNAUTHORIZED', 'Admin authorization is required')
  }

  const params = normalizeCelebrationEnquiriesListParams(input)
  const client = createAdminClient()
  const query = client
    .from('celebration_enquiries')
    .select(
      'id, enquiry_reference, created_at, preferred_date, celebration_type, plan_type, contact_name, mobile, expected_guest_count, guest_count_range, status',
      { count: 'exact' }
    ) as unknown as CelebrationEnquiryQueryBuilder

  const { data, error, count } = await applyCelebrationEnquiriesListQuery(query, params)

  if (error) {
    console.error('Celebration enquiries list query failed', { code: error.code, type: error.name })
    throw new CelebrationEnquiriesListError('QUERY_FAILED', 'Unable to load celebration enquiries right now')
  }

  return {
    rows: (data ?? []) as CelebrationEnquiryListRow[],
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / params.pageSize)),
    params,
  }
}

export async function getUpcomingCelebrationEvents(input: Record<string, string | string[] | undefined> = {}) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) {
    throw new CelebrationEnquiriesListError('UNAUTHORIZED', 'Admin authorization is required')
  }

  const params = normalizeCelebrationEnquiriesListParams(input)
  const client = createAdminClient()
  const query = client
    .from('celebration_enquiries')
    .select(
      'id, enquiry_reference, created_at, preferred_date, celebration_type, plan_type, contact_name, mobile, expected_guest_count, guest_count_range, ceremony_duration, status',
      { count: 'exact' }
    ) as unknown as CelebrationEnquiryQueryBuilder

  const { data, error, count } = await applyUpcomingCelebrationEventsQuery(query, params)
  if (error) {
    console.error('Upcoming celebration events query failed', { code: error.code, type: error.name })
    throw new CelebrationEnquiriesListError('QUERY_FAILED', 'Unable to load upcoming celebration events right now')
  }

  return {
    rows: (data ?? []) as UpcomingCelebrationEventRow[],
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / params.pageSize)),
    params,
  }
}
