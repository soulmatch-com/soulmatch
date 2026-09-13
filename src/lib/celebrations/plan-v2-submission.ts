import type { PublicCelebrationService } from './service-query.ts'
import { celebrationEnquiryApiSchema, type CelebrationEnquiryApiInput } from '../validations/celebration-enquiry-api.schema.ts'
import {
  celebrationPlanVersion,
  getCelebrationPlanDefinition,
  getPlanServiceCodes,
  isCelebrationAddonCode,
} from './celebration-plans.ts'
import { createPlanV2DetailsSchema } from './plan-v2-details.ts'
import type { CelebrationPlanSelection } from './plan-v2.ts'

export type PlanV2SubmissionBuildResult =
  | { ok: true; payload: CelebrationEnquiryApiInput }
  | { ok: false; reason: 'invalid-details' | 'invalid-services' | 'invalid-payload'; message: string }

export function mapPlanV2GuestCountRange(expectedGuestCount: number): CelebrationEnquiryApiInput['guestCountRange'] {
  if (expectedGuestCount < 20) return 'below-20'
  if (expectedGuestCount <= 50) return '20-50'
  if (expectedGuestCount <= 100) return '51-100'
  return '100-plus'
}

export function getPlanV2ExpectedGuestCount(selection: Pick<CelebrationPlanSelection, 'guestPreset' | 'customGuestCount'>) {
  if (selection.guestPreset === 'custom') return selection.customGuestCount
  return Number(selection.guestPreset)
}

export function mapPlanV2ArrangementPreference(): CelebrationEnquiryApiInput['arrangementPreference'] {
  return 'complete-arrangement'
}

export function resolvePlanV2ServiceIds(
  serviceCodes: readonly string[],
  services: readonly PublicCelebrationService[]
) {
  const serviceByCode = new Map(services.map((service) => [service.code, service]))
  const uniqueCodes = [...new Set(serviceCodes)]
  const missingCodes = uniqueCodes.filter((code) => !serviceByCode.has(code))
  if (missingCodes.length > 0) return { ok: false as const, missingCodes, serviceIds: [] }
  return { ok: true as const, missingCodes: [], serviceIds: uniqueCodes.map((code) => serviceByCode.get(code)?.id).filter((id): id is string => Boolean(id)) }
}

export function buildPlanV2ServiceCodes(selection: Pick<CelebrationPlanSelection, 'planType' | 'selectedAddonCodes'>) {
  const validAddonCodes = selection.selectedAddonCodes.filter(isCelebrationAddonCode)
  return getPlanServiceCodes(selection.planType, validAddonCodes)
}

export function buildPlanV2Submission(
  selection: CelebrationPlanSelection,
  services: readonly PublicCelebrationService[]
): PlanV2SubmissionBuildResult {
  const plan = getCelebrationPlanDefinition(selection.planType)
  if (!plan) return { ok: false, reason: 'invalid-payload', message: 'Please review the selected plan before submitting.' }

  if (selection.selectedAddonCodes.some((code) => !isCelebrationAddonCode(code))) {
    return { ok: false, reason: 'invalid-services', message: 'Please review the optional add-ons before submitting.' }
  }

  const details = createPlanV2DetailsSchema().safeParse(selection.details)
  if (!details.success) {
    return { ok: false, reason: 'invalid-details', message: 'Please check the event and contact details before submitting.' }
  }

  const expectedGuestCount = getPlanV2ExpectedGuestCount(selection)
  if (!expectedGuestCount) {
    return { ok: false, reason: 'invalid-payload', message: 'Please review the guest count before submitting.' }
  }

  const serviceResolution = resolvePlanV2ServiceIds(buildPlanV2ServiceCodes(selection), services)
  if (!serviceResolution.ok) {
    return { ok: false, reason: 'invalid-services', message: 'One or more plan services are not available. Please contact support or review your plan.' }
  }

  const payload = {
    celebrationType: selection.ceremony,
    husbandName: details.data.husbandName,
    wifeName: details.data.wifeName,
    husbandDob: details.data.husbandDob,
    wifeDob: details.data.wifeDob,
    husbandNakshatra: details.data.husbandNakshatra,
    wifeNakshatra: details.data.wifeNakshatra,
    husbandRasi: details.data.husbandRasi,
    wifeRasi: details.data.wifeRasi,
    preferredDate: details.data.preferredDate,
    alternativeDate: details.data.alternativeDate,
    guestCountRange: mapPlanV2GuestCountRange(expectedGuestCount),
    travellingFrom: details.data.travellingFrom,
    arrangementPreference: mapPlanV2ArrangementPreference(),
    contactName: details.data.contactName,
    mobile: details.data.mobile,
    email: details.data.email,
    relationship: details.data.relationship,
    preferredContactMethod: details.data.preferredContactMethod,
    serviceIds: serviceResolution.serviceIds,
    expectedGuestCount,
    ceremonyDuration: selection.ceremonyDuration,
    planType: selection.planType,
    planVersion: celebrationPlanVersion,
    specialRequirements: details.data.additionalRequirements,
  }

  const validation = celebrationEnquiryApiSchema.safeParse(payload)
  if (!validation.success) {
    return { ok: false, reason: 'invalid-payload', message: 'Please check the highlighted details before submitting.' }
  }
  return { ok: true, payload: validation.data }
}
