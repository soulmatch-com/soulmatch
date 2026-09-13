import type { CeremonySlug } from '../celebrations.ts'
import type { CelebrationPlanDetailsDraft } from './plan-v2-details.ts'
import type { CelebrationAddonCode, CelebrationPlanType } from './celebration-plans.ts'

export const celebrationPlanV2Enabled = process.env.CELEBRATION_PLAN_V2_ENABLED === 'true'

export const planV2CeremonyOptions = [
  { value: '60th-marriage', label: '60th', accessibleLabel: '60th Marriage' },
  { value: '70th-marriage', label: '70th', accessibleLabel: '70th Marriage' },
  { value: '80th-marriage', label: '80th', accessibleLabel: '80th Marriage' },
] as const satisfies ReadonlyArray<{ value: CeremonySlug; label: string; accessibleLabel: string }>

export const planV2GuestPresets = ['50', '100', 'custom'] as const
export const planV2DurationOptions = [
  { value: 'one_session', label: '1 Session', accessibleLabel: 'One Session' },
  { value: 'two_sessions', label: '2 Sessions', accessibleLabel: 'Two Sessions' },
] as const

export type CelebrationPlanGuestPreset = (typeof planV2GuestPresets)[number]
export type CelebrationPlanDuration = (typeof planV2DurationOptions)[number]['value']
export type CelebrationPlanView = 'arrangement' | 'plan' | 'details' | 'review'
export type CelebrationPlanStepStatus = 'completed' | 'active' | 'upcoming'

export type CelebrationPlanSelection = {
  ceremony: CeremonySlug
  guestPreset: CelebrationPlanGuestPreset
  customGuestCount?: number
  ceremonyDuration: CelebrationPlanDuration
  planType: CelebrationPlanType
  selectedAddonCodes: CelebrationAddonCode[]
  additionalRequirements?: string
  details?: Partial<CelebrationPlanDetailsDraft>
}

export type CelebrationPlanDraftSelection = Partial<Omit<CelebrationPlanSelection, 'planType'>> & {
  planType: CelebrationPlanType | null
}

export const planV2Steps = [
  { id: 'plan', label: 'Plan' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
] as const satisfies readonly { id: Exclude<CelebrationPlanView, 'arrangement'>; label: string }[]

export function isCompletePlanSelection(selection: CelebrationPlanDraftSelection): selection is CelebrationPlanSelection {
  return Boolean(selection.ceremony && selection.guestPreset && selection.ceremonyDuration && selection.planType && (selection.guestPreset !== 'custom' || selection.customGuestCount))
}

export function formatPlanGuestCount(selection: Pick<CelebrationPlanSelection, 'guestPreset' | 'customGuestCount'>) {
  if (selection.guestPreset === 'custom') return `${selection.customGuestCount} Guests`
  return `${selection.guestPreset} Guests`
}

export function formatPlanDuration(duration: CelebrationPlanDuration) {
  return duration === 'two_sessions' ? '2 Sessions' : '1 Session'
}

export function getPlanStepStatuses(view: CelebrationPlanView): Record<(typeof planV2Steps)[number]['id'], CelebrationPlanStepStatus> {
  const activeIndex = Math.max(0, planV2Steps.findIndex((step) => step.id === view))
  return planV2Steps.reduce((statuses, step, index) => {
    statuses[step.id] = index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'upcoming'
    return statuses
  }, {} as Record<(typeof planV2Steps)[number]['id'], CelebrationPlanStepStatus>)
}
