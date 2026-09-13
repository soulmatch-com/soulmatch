export const ceremonySlugs = ['60th-marriage', '70th-marriage', '80th-marriage'] as const
export type CeremonySlug = (typeof ceremonySlugs)[number]

export interface CelebrationFaq {
  question: string
  answer: string
}

export interface CeremonyContent {
  slug: CeremonySlug
  years: 60 | 70 | 80
  title: string
  traditionalName: string
  tamilName: string
  summary: string
  significance: string
  timingGuidance: string
  timingGuidanceTamil: string
  thirukadaiyur: string
  considerations: string[]
  faqs: CelebrationFaq[]
}

export type CeremonySelectionOption = {
  value: CeremonySlug | 'not-sure'
  title: string
  tamil: string
}

const sharedFaqs: CelebrationFaq[] = [
  {
    question: 'Can the celebration follow our family customs?',
    answer:
      'Yes. Planning can be shaped around your family and community traditions. The exact rituals and sequence should be confirmed with your chosen Vadhyar or priest.',
  },
  {
    question: 'Can we request only selected services?',
    answer:
      'Yes. You can request individual services or broader coordination. Availability, scope and cost are confirmed separately during planning.',
  },
  {
    question: 'Can family members travel in from another city?',
    answer:
      'Yes. Accommodation and transportation can be requested, and practical arrangements can be discussed based on your guest group.',
  },
]

export const ceremonies: CeremonyContent[] = [
  {
    slug: '60th-marriage',
    years: 60,
    title: '60th Marriage',
    traditionalName: 'Sashtiapthapoorthi',
    tamilName: '60ஆம் திருமணம் / ஷஷ்டியப்தபூர்த்தி',
    summary: "A cherished family occasion marking a major life milestone and the couple's shared journey.",
    significance:
      'Sashtiapthapoorthi is often observed as a time for gratitude, blessings and renewal in the presence of children, grandchildren and loved ones. Its meaning and ceremony format can differ between families and communities.',
    timingGuidance:
      'Some families may observe Ugraratha Shanthi around the beginning of the 60th year, while Sashtiapthapoorthi is associated with the completion of 60 years. The exact ceremony and timing may depend on family tradition and Vadhyar or priest guidance.',
    timingGuidanceTamil:
      'சில குடும்பங்கள் 60ஆம் வயது தொடக்கத்தில் உக்ரரத சாந்தியை அனுசரிக்கலாம்; 60 ஆண்டுகள் நிறைவுடன் ஷஷ்டியப்தபூர்த்தியை தொடர்புபடுத்தலாம். குடும்ப சம்பிரதாயம் மற்றும் வாத்தியார் / புரோகிதர் வழிகாட்டுதலின் அடிப்படையில் சரியான விழாவும் நேரமும் மாறுபடலாம்.',
    thirukadaiyur:
      "Families may choose Thirukadaiyur for its long association with prayers for wellbeing and longevity. Venue, temple and ceremony arrangements should be planned around local requirements and the family's guidance.",
    considerations: ['Confirm the preferred date with family and priest', 'Choose a home, temple or marriage-hall setting', 'Plan guest meals, travel and accommodation', 'Allow comfortable timing for the celebrating couple'],
    faqs: sharedFaqs,
  },
  {
    slug: '70th-marriage',
    years: 70,
    title: '70th Marriage',
    traditionalName: 'Bheemaratha Shanthi',
    tamilName: '70ஆம் திருமணம் / பீமரத சாந்தி',
    summary: "A meaningful seventieth-year observance centred on family, wellbeing and honouring the couple's life together.",
    significance:
      'Bheemaratha Shanthi brings generations together to honour the elders and seek blessings for peace and wellbeing. Ritual details, timing and terminology may vary according to community and family practice.',
    timingGuidance:
      'The ceremony and timing for a 70th milestone observance may vary according to family tradition, community practice and Vadhyar or priest guidance.',
    timingGuidanceTamil:
      '70ஆம் வயது தொடர்பான விழாவின் வழிமுறையும் நேரமும் குடும்ப சம்பிரதாயம், சமூக வழக்கம் மற்றும் வாத்தியார் / புரோகிதர் வழிகாட்டுதலின் அடிப்படையில் மாறுபடலாம்.',
    thirukadaiyur:
      'Thirukadaiyur offers a traditional setting for families who wish to combine the milestone with temple-focused arrangements. Early coordination is useful when guests need travel, stay or venue support.',
    considerations: ['Discuss the ceremony format with the chosen Vadhyar', 'Plan around the comfort and mobility of elders', 'Coordinate temple or venue timings in advance', 'Keep family travel and hospitality in one clear schedule'],
    faqs: sharedFaqs,
  },
  {
    slug: '80th-marriage',
    years: 80,
    title: '80th Marriage',
    traditionalName: 'Sathabhishekam',
    tamilName: '80ஆம் திருமணம் / சதாபிஷேகம்',
    summary: "A deeply valued later-life milestone celebrating the couple's wisdom, togetherness and place within the family.",
    significance:
      'Sathabhishekam is traditionally associated with a remarkable life milestone and a gathering of several generations. Exact age, timing and ritual expectations are best determined with the family’s priest and tradition.',
    timingGuidance:
      'The ceremony and timing for an 80th milestone observance may vary according to family tradition, community practice and Vadhyar or priest guidance.',
    timingGuidanceTamil:
      '80ஆம் வயது தொடர்பான விழாவின் வழிமுறையும் நேரமும் குடும்ப சம்பிரதாயம், சமூக வழக்கம் மற்றும் வாத்தியார் / புரோகிதர் வழிகாட்டுதலின் அடிப்படையில் மாறுபடலாம்.',
    thirukadaiyur:
      'For families gathering at Thirukadaiyur, an elder-friendly plan can bring ceremony planning, temple-related planning assistance, meals and guest arrangements together without rushing the occasion.',
    considerations: ['Prioritise an elder-friendly pace and accessible venue', 'Confirm customs and auspicious timing with trusted guidance', 'Plan seating, meals and rest periods for guests', 'Coordinate photography without interrupting rituals'],
    faqs: sharedFaqs,
  },
]

export const ceremonySelectionOptions: CeremonySelectionOption[] = [
  ...ceremonies.map((ceremony) => ({
    value: ceremony.slug,
    title: `${ceremony.years}th — ${ceremony.traditionalName}`,
    tamil: ceremony.tamilName,
  })),
  {
    value: 'not-sure',
    title: 'Not Sure — Need Guidance',
    tamil: 'வழிகாட்டுதல் தேவை',
  },
]

export function getCeremony(slug: string) {
  return ceremonies.find((ceremony) => ceremony.slug === slug)
}

export function isCeremonySlug(value: string | undefined): value is CeremonySlug {
  return ceremonySlugs.includes(value as CeremonySlug)
}
