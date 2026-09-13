export const celebrationPlanTypes = ['basic', 'premium'] as const
export const celebrationAddonCodes = ['transportation', 'return_gifts'] as const
export const celebrationPlanVersion = 1

export type CelebrationPlanType = (typeof celebrationPlanTypes)[number]
export type CelebrationAddonCode = (typeof celebrationAddonCodes)[number]

export type CelebrationPlanSection = {
  title: string
  items: readonly string[]
}

export type CelebrationPlanDefinition = {
  type: CelebrationPlanType
  name: string
  tamilName: string
  subtitle: string
  shortDescription: string
  version: number
  preview: readonly string[]
  includedServiceCodes: readonly string[]
  sections: readonly CelebrationPlanSection[]
}

const coreServiceCodes = [
  'vadhyar',
  'pooja_materials',
  'marriage_hall',
  'catering',
  'accommodation',
  'photography',
  'videography',
  'decoration',
  'nadaswaram',
] as const

export const celebrationPlanDefinitions = [
  {
    type: 'basic',
    name: 'Basic Plan',
    tamilName: 'அடிப்படை ஏற்பாடு',
    subtitle: 'Traditional & Practical',
    shortDescription: 'A defined morning celebration plan with shared ceremony arrangements and practical family support.',
    version: celebrationPlanVersion,
    preview: ['Pooja & Homam', 'Air-conditioned Hall', 'Breakfast & Lunch', 'Rooms for 10 Guests', 'Photography & Videography', 'Mangala Isai'],
    includedServiceCodes: coreServiceCodes,
    sections: [
      { title: 'Pooja', items: ['Pooja and Homam with 16 Kalasam', 'Conducted in a common/shared space'] },
      { title: 'Hall', items: ['Air-conditioned hall', 'Minimal decoration', 'Seating for up to 50 guests to receive Aashirvaadham'] },
      { title: 'Food', items: ['Breakfast with coffee', 'Lunch'] },
      { title: 'Rooms', items: ['Rooms arranged for 10 guests', 'Additional rooms available at extra cost'] },
      { title: 'Photography & Videography', items: ['One photo camera', 'One video camera', 'Synthetic album — 120 photos with acrylic pad', 'One pendrive with all photos', 'One pendrive with edited video'] },
      { title: 'Mangala Isai', items: ['Common Mangala Isai team'] },
    ],
  },
  {
    type: 'premium',
    name: 'Premium Plan',
    tamilName: 'பிரீமியம் ஏற்பாடு',
    subtitle: 'Private & Enhanced Arrangements',
    shortDescription: 'A defined morning celebration plan with private ceremony space and enhanced family arrangements.',
    version: celebrationPlanVersion,
    preview: ['Pooja & Homam', 'Private Ceremony Space', 'Private Hall', 'Breakfast & Lunch', 'Rooms for 10 Guests', 'Photography & Videography', 'Moderate Decoration', 'Special Mangala Isai'],
    includedServiceCodes: coreServiceCodes,
    sections: [
      { title: 'Pooja', items: ['Pooja and Homam with 16 Kalasam', 'Conducted in a private space'] },
      { title: 'Hall', items: ['Private hall', 'Aashirvaadham conducted in the same space'] },
      { title: 'Food', items: ['Breakfast with coffee', 'Lunch'] },
      { title: 'Rooms', items: ['Rooms arranged for 10 guests', 'Additional rooms available at extra cost'] },
      { title: 'Photography & Videography', items: ['One photo camera', 'One video camera', 'Trendy synthetic album — 120 photos', 'One pendrive with all photos', 'One pendrive with edited video'] },
      { title: 'Decoration', items: ['Moderate artificial flower decoration', 'Additional decoration available at extra cost'] },
      { title: 'Mangala Isai', items: ['Special Mangala Isai team'] },
    ],
  },
] as const satisfies readonly CelebrationPlanDefinition[]

export function getCelebrationPlanDefinition(type: CelebrationPlanType) {
  return celebrationPlanDefinitions.find((plan) => plan.type === type)
}

export function isCelebrationAddonCode(code: string): code is CelebrationAddonCode {
  return celebrationAddonCodes.includes(code as CelebrationAddonCode)
}

export function getPlanServiceCodes(planType: CelebrationPlanType, selectedAddonCodes: readonly CelebrationAddonCode[]) {
  const plan = getCelebrationPlanDefinition(planType)
  return [...new Set([...(plan?.includedServiceCodes ?? []), ...selectedAddonCodes])]
}
