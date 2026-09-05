import type { Database } from '@/types/database.types'
import type { CelebrationEnquiryApiInput } from '@/lib/validations/celebration-enquiry-api.schema'

export const THIRUKADAIYUR_LOCATION = 'thirukadaiyur' as const

type RpcArgs = Database['public']['Functions']['create_celebration_enquiry']['Args']

export interface CelebrationRpcClient {
  rpc(
    name: 'create_celebration_enquiry',
    args: RpcArgs
  ): PromiseLike<{ data: string | null; error: { code?: string } | null }>
}

export function toCelebrationRpcArgs(input: CelebrationEnquiryApiInput): RpcArgs {
  return {
    p_location: THIRUKADAIYUR_LOCATION,
    p_celebration_type: input.celebrationType,
    p_husband_name: input.husbandName,
    p_wife_name: input.wifeName,
    p_husband_dob: input.husbandDob,
    p_wife_dob: input.wifeDob,
    p_preferred_date: input.preferredDate,
    p_guest_count_range: input.guestCountRange,
    p_arrangement_preference: input.arrangementPreference,
    p_contact_name: input.contactName,
    p_mobile: input.mobile,
    p_preferred_contact_method: input.preferredContactMethod,
    p_service_ids: input.serviceIds,
    p_alternative_date: input.alternativeDate ?? null,
    p_husband_nakshatra: input.husbandNakshatra ?? null,
    p_wife_nakshatra: input.wifeNakshatra ?? null,
    p_husband_rasi: input.husbandRasi ?? null,
    p_wife_rasi: input.wifeRasi ?? null,
    p_travelling_from: input.travellingFrom ?? null,
    p_email: input.email ?? null,
    p_relationship: input.relationship ?? null,
    p_other_service_details: input.otherServiceDetails ?? null,
    p_notes: input.notes ?? null,
  }
}

export async function persistCelebrationEnquiry(client: CelebrationRpcClient, input: CelebrationEnquiryApiInput) {
  const args = toCelebrationRpcArgs(input)
  const { data, error } = await client.rpc('create_celebration_enquiry', args)

  if (error || !data) return { success: false as const, errorCode: error?.code }
  return { success: true as const, enquiryId: data }
}
