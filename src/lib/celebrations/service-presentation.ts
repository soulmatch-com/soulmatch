import type { PublicCelebrationService } from './service-query'

export const serviceGroups = ['Ceremony', 'Food & Celebration', 'Stay & Travel', 'Additional Support', 'Other Services'] as const
type ServiceGroup = (typeof serviceGroups)[number]

// Presentation only. All catalogue content and selection IDs come from Supabase.
const groupByCode: Readonly<Record<string, ServiceGroup>> = {
  vadhyar: 'Ceremony',
  pooja_materials: 'Ceremony',
  marriage_hall: 'Ceremony',
  temple_coordination: 'Ceremony',
  nadaswaram: 'Ceremony',
  catering: 'Food & Celebration',
  decoration: 'Food & Celebration',
  photography: 'Food & Celebration',
  videography: 'Food & Celebration',
  accommodation: 'Stay & Travel',
  transportation: 'Stay & Travel',
  invitations: 'Additional Support',
  return_gifts: 'Additional Support',
  complete_arrangement: 'Additional Support',
}

export function groupCelebrationServices(services: PublicCelebrationService[]) {
  return serviceGroups.map((name) => ({
    name,
    services: services.filter((service) =>
      (Object.hasOwn(groupByCode, service.code) ? groupByCode[service.code] : 'Other Services') === name),
  })).filter((group) => group.services.length > 0)
}
