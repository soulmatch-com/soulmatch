import 'server-only'

import { z } from 'zod'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CelebrationEnquiryStatus } from './admin-enquiries-core'
import type { CelebrationEnquiryHistoryEntry } from './admin-enquiry-detail-core'

export * from './admin-enquiry-detail-core'

export interface CelebrationEnquiryDetail {
  id: string
  enquiry_reference: string | null
  location: string
  celebration_type: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
  husband_name: string
  wife_name: string
  husband_dob: string
  wife_dob: string
  husband_nakshatra: string | null
  wife_nakshatra: string | null
  husband_rasi: string | null
  wife_rasi: string | null
  preferred_date: string
  alternative_date: string | null
  guest_count_range: 'below-20' | '20-50' | '51-100' | '100-plus'
  travelling_from: string | null
  arrangement_preference: string
  expected_guest_count: number | null
  plan_type: 'basic' | 'premium' | null
  plan_version: number | null
  special_requirements: string | null
  ceremony_duration: 'one_session' | 'two_sessions' | null
  contact_name: string
  mobile: string
  email: string | null
  relationship: string | null
  preferred_contact_method: 'phone' | 'whatsapp' | 'email'
  other_service_details: string | null
  notes: string | null
  status: CelebrationEnquiryStatus | null
  created_at: string
}

export interface CelebrationEnquiryService {
  id: string
  name: string
}

export class CelebrationEnquiryDetailError extends Error {
  constructor(public readonly code: 'UNAUTHORIZED' | 'NOT_FOUND' | 'QUERY_FAILED', message: string) {
    super(message)
    this.name = 'CelebrationEnquiryDetailError'
  }
}

const enquiryIdSchema = z.string().uuid()
const detailFields = 'id, enquiry_reference, location, celebration_type, husband_name, wife_name, husband_dob, wife_dob, husband_nakshatra, wife_nakshatra, husband_rasi, wife_rasi, preferred_date, alternative_date, guest_count_range, travelling_from, arrangement_preference, expected_guest_count, plan_type, plan_version, special_requirements, ceremony_duration, contact_name, mobile, email, relationship, preferred_contact_method, other_service_details, notes, status, created_at'

export async function getCelebrationEnquiryDetail(enquiryId: string) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) {
    throw new CelebrationEnquiryDetailError('UNAUTHORIZED', 'Admin authorization is required')
  }

  if (!enquiryIdSchema.safeParse(enquiryId).success) {
    throw new CelebrationEnquiryDetailError('NOT_FOUND', 'Celebration enquiry not found')
  }

  const client = createAdminClient()
  const { data: enquiry, error: enquiryError } = await client
    .from('celebration_enquiries')
    .select(detailFields)
    .eq('id', enquiryId)
    .maybeSingle()

  if (enquiryError) {
    console.error('Celebration enquiry detail query failed', { code: enquiryError.code, type: enquiryError.name })
    throw new CelebrationEnquiryDetailError('QUERY_FAILED', 'Unable to load celebration enquiry right now')
  }
  if (!enquiry) {
    throw new CelebrationEnquiryDetailError('NOT_FOUND', 'Celebration enquiry not found')
  }

  const [servicesResult, historyResult] = await Promise.all([
    client
      .from('celebration_enquiry_services')
      .select('service_id, celebration_services(id, name)')
      .eq('enquiry_id', enquiryId),
    client
      .from('celebration_enquiry_status_history')
      .select('id, enquiry_id, from_status, to_status, remarks, changed_by, changed_at')
      .eq('enquiry_id', enquiryId)
      .order('changed_at', { ascending: false }),
  ])

  if (servicesResult.error || historyResult.error) {
    console.error('Celebration enquiry related data query failed', {
      servicesCode: servicesResult.error?.code,
      historyCode: historyResult.error?.code,
    })
    throw new CelebrationEnquiryDetailError('QUERY_FAILED', 'Unable to load celebration enquiry right now')
  }

  const rawHistory = (historyResult.data ?? []) as Array<Omit<CelebrationEnquiryHistoryEntry, 'changed_by'> & { changed_by: string | null }>
  const adminIds = [...new Set(rawHistory.flatMap((entry) => entry.changed_by ? [entry.changed_by] : []))]
  const { data: admins, error: adminsError } = adminIds.length > 0
    ? await client.from('admins').select('id, name, email').in('id', adminIds)
    : { data: [], error: null }

  if (adminsError) {
    console.error('Celebration enquiry history admin query failed', { code: adminsError.code, type: adminsError.name })
    throw new CelebrationEnquiryDetailError('QUERY_FAILED', 'Unable to load celebration enquiry right now')
  }

  const adminsById = new Map((admins ?? []).map((admin) => [admin.id, { name: admin.name ?? null, email: admin.email ?? null }]))
  const history: CelebrationEnquiryHistoryEntry[] = rawHistory.map((entry) => ({
    ...entry,
    changed_by: entry.changed_by ? adminsById.get(entry.changed_by) ?? { name: null, email: null } : null,
  }))

  const services: CelebrationEnquiryService[] = (servicesResult.data ?? []).flatMap((row) => {
    const service = row.celebration_services as unknown as { id: string; name: string } | null
    return service ? [{ id: service.id, name: service.name }] : []
  })

  return { enquiry: enquiry as CelebrationEnquiryDetail, services, history }
}
