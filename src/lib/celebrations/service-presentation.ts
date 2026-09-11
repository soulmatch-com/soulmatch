import type { PublicCelebrationService } from './service-query'

export const serviceGroups = ['Ceremony Support', 'Food & Celebration', 'Stay & Travel', 'Additional Arrangements', 'Other Services'] as const
type ServiceGroup = (typeof serviceGroups)[number]

// Presentation only. All catalogue content and selection IDs come from Supabase.
const groupByCode: Readonly<Record<string, ServiceGroup>> = {
  vadhyar: 'Ceremony Support',
  pooja_materials: 'Ceremony Support',
  marriage_hall: 'Ceremony Support',
  temple_coordination: 'Ceremony Support',
  nadaswaram: 'Ceremony Support',
  catering: 'Food & Celebration',
  decoration: 'Food & Celebration',
  photography: 'Food & Celebration',
  videography: 'Food & Celebration',
  accommodation: 'Stay & Travel',
  transportation: 'Stay & Travel',
  invitations: 'Additional Arrangements',
  return_gifts: 'Additional Arrangements',
  complete_arrangement: 'Additional Arrangements',
}

export function getCelebrationServiceGroup(service: Pick<PublicCelebrationService, 'code'>): ServiceGroup {
  return Object.hasOwn(groupByCode, service.code) ? groupByCode[service.code] : 'Other Services'
}

export function groupCelebrationServices(services: PublicCelebrationService[]) {
  return serviceGroups.map((name) => ({
    name,
    services: services.filter((service) => getCelebrationServiceGroup(service) === name),
  })).filter((group) => group.services.length > 0)
}
