export type BlogLocale = 'en' | 'ta'
export type BlogStatus = 'published' | 'draft'

export type BlogMetadata = {
  slug: string
  translationKey: string
  locale: BlogLocale
  title: string
  seoTitle?: string
  description: string
  publishedAt: string
  updatedAt?: string
  category: string
  ceremony: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'general'
  excerpt: string
  status: BlogStatus
}

export type BlogSection =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: readonly string[] }
  | { type: 'note'; text: string }
  | { type: 'faq'; items: readonly { question: string; answer: string }[] }

export type BlogLink = {
  href: string
  label: string
}

export type BlogArticle = BlogMetadata & {
  body: readonly BlogSection[]
  links: readonly BlogLink[]
  cta: {
    title: string
    text: string
    label: string
    href: string
  }
}

export const blogLocales = ['en', 'ta'] as const satisfies readonly BlogLocale[]

export const blogArticles: readonly BlogArticle[] = [
  {
    slug: '60th-marriage-thirukadaiyur',
    translationKey: '60th-marriage-thirukadaiyur',
    locale: 'en',
    title: '60th Marriage in Thirukadaiyur: A Complete Planning Guide',
    description:
      'Learn how to plan a 60th marriage and Sashtiapthapoorthi celebration in Thirukadaiyur, including family preparation, services, stay, food and travel.',
    publishedAt: '2026-09-11',
    category: 'Celebration Planning',
    ceremony: '60th-marriage',
    excerpt:
      'A practical guide for families planning a 60th marriage or Sashtiapthapoorthi celebration in Thirukadaiyur.',
    status: 'published',
    body: [
      {
        type: 'paragraph',
        text:
          'A 60th marriage celebration is often one of the most meaningful family gatherings in a couple’s life. Children, relatives and elders come together to honour the couple, seek blessings and celebrate decades of shared life. When the celebration is planned in Thirukadaiyur, families usually need to think about both the ceremony and the practical arrangements around it.',
      },
      {
        type: 'note',
        text:
          'Ceremony procedures, timing and customs may vary according to family tradition, community practices and Vadhyar or priest guidance.',
      },
      { type: 'heading', text: 'What is a 60th marriage celebration?' },
      {
        type: 'paragraph',
        text:
          'In many families, the 60th marriage celebration is a way to honour the couple as they enter an important life stage. It may include prayers, blessings from family members, renewal-style marriage rituals and a gathering of relatives. The exact format is not the same for every family, so the first step is to understand what your elders and family tradition expect.',
      },
      { type: 'heading', text: 'What is Sashtiapthapoorthi?' },
      {
        type: 'paragraph',
        text:
          'Sashtiapthapoorthi is commonly associated with the completion of 60 years. Some families may observe Ugraratha Shanthi around the beginning of the 60th year, while Sashtiapthapoorthi is commonly associated with the completion of 60 years. Practices can vary according to family tradition, community customs and Vadhyar or priest guidance.',
      },
      { type: 'heading', text: '60th year vs completion of 60 years' },
      {
        type: 'paragraph',
        text:
          'Families sometimes use the phrase “60th marriage” loosely, but the timing may need careful discussion. Some plan around the start of the 60th year, while others plan after 60 years are completed. Before fixing travel or venue arrangements, speak with the family’s trusted Vadhyar or priest about the correct observance, date and ritual sequence for your tradition.',
      },
      { type: 'heading', text: 'Why families choose Thirukadaiyur' },
      {
        type: 'paragraph',
        text:
          'Thirukadaiyur is closely associated with prayers for longevity and family wellbeing. Many families choose it because the place feels meaningful for milestone marriage observances. Planning there can also involve local arrangements such as a marriage hall, meals, stay, transport and temple-related planning assistance, so it helps to keep the event schedule clear from the beginning.',
      },
      { type: 'heading', text: 'What to discuss with your family before planning' },
      {
        type: 'list',
        items: [
          'Who is coordinating the celebration on behalf of the family',
          'Preferred month, date range and any dates the family wants to avoid',
          'Expected guest count and whether elders need accessible seating or rest time',
          'Whether the celebration should be simple, extended, or include a wider family gathering',
          'Which services the family wants help arranging',
        ],
      },
      { type: 'heading', text: 'What to confirm with your Vadhyar or priest' },
      {
        type: 'list',
        items: [
          'Whether the family should observe Ugraratha Shanthi, Sashtiapthapoorthi, or another ritual sequence',
          'The preferred date and time based on the couple’s details and family practice',
          'Required pooja materials and whether any items should be brought by the family',
          'How much time the ceremony may take and when guests should arrive',
          'Any customs specific to the family, community or native place',
        ],
      },
      { type: 'heading', text: 'Choosing the celebration date' },
      {
        type: 'paragraph',
        text:
          'Try to shortlist dates only after speaking with the family and Vadhyar or priest. Once the date range is clear, you can plan guest travel, accommodation and food more confidently. If the exact date is not decided, you can still begin a planning enquiry and mention that the date is tentative.',
      },
      { type: 'heading', text: 'Guest planning' },
      {
        type: 'paragraph',
        text:
          'Guest count affects almost every practical decision: hall size, dining, transportation, photography coverage and stay. It is useful to estimate a range first, such as close family only or a larger extended-family gathering, and refine it as relatives confirm travel.',
      },
      { type: 'heading', text: 'Ceremony-related arrangements' },
      {
        type: 'paragraph',
        text:
          'Families may need support with Vadhyar or priest arrangements, pooja materials, marriage hall coordination, temple-related planning assistance and Nadaswaram. These are best discussed as planning requirements, with final scope and availability confirmed before the event.',
      },
      { type: 'heading', text: 'Food and hospitality' },
      {
        type: 'paragraph',
        text:
          'Food is central to the comfort of guests. Decide whether the family needs breakfast, lunch, dinner, coffee or light refreshments, and whether elderly guests require a simpler schedule. Catering and hospitality should match the ceremony timing rather than forcing the ceremony to rush.',
      },
      { type: 'heading', text: 'Accommodation' },
      {
        type: 'paragraph',
        text:
          'If guests are travelling from Chennai, other parts of Tamil Nadu, other Indian cities or abroad, stay arrangements should be discussed early. Share the approximate number of rooms, elder-friendly needs and arrival dates when you send the planning request.',
      },
      { type: 'heading', text: 'Transportation' },
      {
        type: 'paragraph',
        text:
          'Transportation may be needed for railway station or airport transfers, local movement between stay and venue, or group travel for relatives. A simple arrival and departure list can prevent confusion on the event day.',
      },
      { type: 'heading', text: 'Photography and videography' },
      {
        type: 'paragraph',
        text:
          'Photography and videography can help preserve the occasion without interrupting the rituals. Discuss whether the family wants only key ceremony coverage or broader family moments as well. The comfort of the celebrating couple should guide the pace.',
      },
      { type: 'heading', text: 'Planning checklist' },
      {
        type: 'list',
        items: [
          'Confirm the ceremony type and timing guidance with the Vadhyar or priest',
          'Shortlist a preferred date or date range',
          'Estimate guest count and elder-comfort requirements',
          'Decide which services the family needs',
          'Share travel, stay and food requirements clearly',
          'Review all information before sending the planning enquiry',
        ],
      },
      {
        type: 'faq',
        items: [
          {
            question: 'When should we start planning?',
            answer:
              'Start once the family has a broad date range and guest estimate. Earlier planning is useful when relatives need travel and accommodation.',
          },
          {
            question: 'What details should we collect first?',
            answer:
              'Collect the ceremony preference, couple details required by your priest, date range, guest count, travelling city and services needed.',
          },
          {
            question: 'Can we plan if the date is not decided?',
            answer:
              'Yes. You can send a planning enquiry with a tentative date range and discuss next steps once the family has clarity.',
          },
          {
            question: 'What services can we select?',
            answer:
              'You can request services such as Vadhyar or priest, pooja materials, marriage hall, temple-related planning assistance, catering, decoration, photography, videography, Nadaswaram, accommodation, transportation, invitations, return gifts and Complete Arrangement.',
          },
          {
            question: 'Do customs differ between families?',
            answer:
              'Yes. Ritual details and timing may differ by family tradition, community practice and Vadhyar or priest guidance.',
          },
          {
            question: 'Does submitting the form confirm a booking?',
            answer:
              'No. Submitting the form sends a planning enquiry. Availability, scope, timing and next steps are discussed after your requirements are reviewed.',
          },
        ],
      },
    ],
    links: [
      { href: '/60th-marriage', label: 'Related ceremony page' },
      { href: '/plan', label: 'Send a planning enquiry' },
      { href: '/blog', label: 'Back to guides' },
    ],
    cta: {
      title: 'Planning a Celebration in Thirukadaiyur?',
      text: "Share your family's celebration requirements, preferred date and the support you need.",
      label: 'Plan Celebration',
      href: '/plan',
    },
  },
  {
    slug: '60th-marriage-thirukadaiyur',
    translationKey: '60th-marriage-thirukadaiyur',
    locale: 'ta',
    title: 'திருக்கடையூரில் 60ஆம் திருமணம்: முழுமையான திட்டமிடல் வழிகாட்டி',
    description:
      'திருக்கடையூரில் 60ஆம் திருமணம் மற்றும் ஷஷ்டியப்த பூர்த்தி விழாவை திட்டமிட தேவையான குடும்ப ஏற்பாடுகள், சேவைகள், உணவு, தங்குமிடம் மற்றும் பயண தகவல்களை அறிந்துகொள்ளுங்கள்.',
    publishedAt: '2026-09-11',
    category: 'விழா திட்டமிடல்',
    ceremony: '60th-marriage',
    excerpt:
      'திருக்கடையூரில் 60ஆம் திருமணம் அல்லது ஷஷ்டியப்த பூர்த்தி விழாவை திட்டமிடும் குடும்பங்களுக்கு பயனுள்ள வழிகாட்டி.',
    status: 'published',
    body: [
      {
        type: 'paragraph',
        text:
          '60ஆம் திருமணம் என்பது ஒரு தம்பதியின் வாழ்க்கையில் குடும்பம் ஒன்றாக கூடும் அர்த்தமுள்ள தருணம். பிள்ளைகள், உறவினர்கள், பெரியவர்கள் அனைவரும் சேர்ந்து ஆசீர்வாதம் பெறவும், நன்றியுடன் கொண்டாடவும் இந்த விழாவை திட்டமிடுகிறார்கள். திருக்கடையூரில் இதை நடத்த நினைக்கும் குடும்பங்களுக்கு சடங்கு ஏற்பாடுகளுடன், உணவு, தங்குமிடம், போக்குவரத்து போன்ற நடைமுறை தேவைகளையும் முன்கூட்டியே சிந்திப்பது உதவும்.',
      },
      {
        type: 'note',
        text:
          'விழாவின் சடங்குகள், நேரம் மற்றும் வழக்கங்கள் குடும்ப சம்பிரதாயம், சமூக மரபுகள் மற்றும் வாத்தியார் / புரோகிதர் வழிகாட்டுதலின்படி மாறுபடலாம்.',
      },
      { type: 'heading', text: '60ஆம் திருமணம் என்றால் என்ன?' },
      {
        type: 'paragraph',
        text:
          'பல குடும்பங்களில் 60ஆம் திருமணம் என்பது தம்பதியின் வாழ்க்கைப் பயணத்தை மதித்து கொண்டாடும் நிகழ்வாக பார்க்கப்படுகிறது. குடும்ப ஆசீர்வாதம், பூஜை, திருமணத்தை நினைவூட்டும் சடங்குகள் மற்றும் உறவினர்கள் கூடும் நிகழ்ச்சி ஆகியவை இதில் இடம்பெறலாம். ஆனால் ஒவ்வொரு குடும்பத்தின் நடைமுறையும் வேறுபடலாம்.',
      },
      { type: 'heading', text: 'ஷஷ்டியப்த பூர்த்தி என்றால் என்ன?' },
      {
        type: 'paragraph',
        text:
          'ஷஷ்டியப்த பூர்த்தி பொதுவாக 60 ஆண்டுகள் நிறைவுடன் தொடர்புபடுத்தப்படுகிறது. சில குடும்பங்கள் 60ஆம் வயது தொடக்கத்தில் உக்ரரத சாந்தியை அனுசரிக்கலாம்; ஷஷ்டியப்த பூர்த்தி 60 ஆண்டுகள் நிறைவுடன் தொடர்புடையதாக சில மரபுகளில் பார்க்கப்படுகிறது. குடும்ப சம்பிரதாயம், சமூக வழக்கம் மற்றும் வாத்தியார் / புரோகிதர் ஆலோசனைப்படி நடைமுறை மாறுபடலாம்.',
      },
      { type: 'heading', text: '60ஆம் வயது தொடக்கம் மற்றும் 60 ஆண்டுகள் நிறைவு' },
      {
        type: 'paragraph',
        text:
          '“60ஆம் திருமணம்” என்ற சொல்லை குடும்பங்கள் பொதுவாக பயன்படுத்தினாலும், சரியான சடங்கு மற்றும் நேரம் பற்றி தெளிவு பெற வேண்டும். தேதி, மண்டபம், பயணம் போன்றவற்றை உறுதி செய்வதற்கு முன், உங்கள் குடும்பம் நம்பும் வாத்தியார் அல்லது புரோகிதரிடம் ஆலோசித்து விழா முறையை முடிவு செய்வது நல்லது.',
      },
      { type: 'heading', text: 'திருக்கடையூரை குடும்பங்கள் ஏன் தேர்வு செய்கிறார்கள்?' },
      {
        type: 'paragraph',
        text:
          'திருக்கடையூர் ஆயுள், நலன் மற்றும் குடும்ப பிரார்த்தனைகளுடன் பலரால் தொடர்புபடுத்தப்படும் இடமாக உள்ளது. அதனால் வாழ்க்கையின் முக்கிய திருமண மைல்கல் விழாக்களுக்கு பல குடும்பங்கள் இந்த இடத்தை தேர்வு செய்கிறார்கள். இங்கு விழா நடத்தும்போது மண்டபம், உணவு, தங்குமிடம், போக்குவரத்து மற்றும் கோவில் தொடர்பான திட்டமிடல் உதவி போன்றவற்றை தெளிவாக திட்டமிடுவது பயனுள்ளதாக இருக்கும்.',
      },
      { type: 'heading', text: 'விழாவிற்கு முன் குடும்பத்துடன் பேச வேண்டியவை' },
      {
        type: 'list',
        items: [
          'குடும்பத்தின் சார்பில் யார் திட்டமிடலை ஒருங்கிணைக்கிறார்கள்',
          'விருப்பமான மாதம், தேதி வரம்பு மற்றும் தவிர்க்க வேண்டிய நாட்கள்',
          'எத்தனை விருந்தினர்கள் வரலாம், பெரியவர்களுக்கு ஓய்வு அல்லது வசதி தேவையா',
          'விழா எளிமையாக இருக்க வேண்டுமா அல்லது பெரிய குடும்பக் கூடலாக இருக்க வேண்டுமா',
          'எந்த சேவைகளுக்கு உதவி தேவைப்படுகிறது',
        ],
      },
      { type: 'heading', text: 'வாத்தியார் / புரோகிதரிடம் உறுதிப்படுத்த வேண்டியவை' },
      {
        type: 'list',
        items: [
          'உக்ரரத சாந்தி, ஷஷ்டியப்த பூர்த்தி அல்லது வேறு சடங்கு முறையா என்பதை உறுதிப்படுத்துதல்',
          'குடும்ப வழக்கத்திற்கு ஏற்ற தேதி மற்றும் நேரம்',
          'தேவையான பூஜை பொருட்கள்',
          'சடங்கு எவ்வளவு நேரம் நடைபெறலாம், விருந்தினர்கள் எப்போது வர வேண்டும்',
          'குடும்பம், சமூக மரபு அல்லது ஊர் வழக்கத்திற்கான சிறப்பு நடைமுறைகள்',
        ],
      },
      { type: 'heading', text: 'விழா தேதி திட்டமிடல்' },
      {
        type: 'paragraph',
        text:
          'குடும்பம் மற்றும் வாத்தியார் / புரோகிதருடன் பேசிய பிறகு தேதி வரம்பை முடிவு செய்வது சிறந்தது. தேதி இன்னும் உறுதி செய்யப்படவில்லை என்றாலும், திட்டமிடும் கோரிக்கையை அனுப்பும்போது அது தற்காலிகம் என்று தெரிவிக்கலாம்.',
      },
      { type: 'heading', text: 'விருந்தினர் ஏற்பாடு' },
      {
        type: 'paragraph',
        text:
          'விருந்தினர் எண்ணிக்கை மண்டபம், உணவு, தங்குமிடம், போக்குவரத்து, புகைப்படம் போன்ற பல ஏற்பாடுகளை பாதிக்கும். முதலில் ஒரு கணக்கை அமைத்து, உறவினர்கள் வருகை உறுதிப்படுத்தும் போது அதை மேம்படுத்தலாம்.',
      },
      { type: 'heading', text: 'விழா தொடர்பான ஏற்பாடுகள்' },
      {
        type: 'paragraph',
        text:
          'வாத்தியார் / புரோகிதர், பூஜை பொருட்கள், திருமண மண்டபம், கோவில் தொடர்பான திட்டமிடல் உதவி, நாதஸ்வரம் போன்ற உதவிகள் தேவைப்படலாம். இவை அனைத்தும் கோரிக்கையாக பகிரப்படும்; கிடைக்கும் நிலை, சேவை வரம்பு மற்றும் அடுத்த படிகள் பின்னர் உறுதிப்படுத்தப்படும்.',
      },
      { type: 'heading', text: 'உணவு மற்றும் விருந்தோம்பல்' },
      {
        type: 'paragraph',
        text:
          'விருந்தினர்களின் வசதிக்கு உணவு முக்கியமானது. காலை உணவு, மதிய உணவு, இரவு உணவு, காபி அல்லது சிற்றுண்டி தேவையா என்று முன்னதாக முடிவு செய்யலாம். சடங்கு நேரத்திற்கேற்ப உணவு ஏற்பாடு அமைந்தால் நிகழ்ச்சி அமைதியாக இருக்கும்.',
      },
      { type: 'heading', text: 'தங்குமிடம்' },
      {
        type: 'paragraph',
        text:
          'சென்னை, தமிழ்நாட்டின் பிற பகுதிகள், இந்தியாவின் வேறு நகரங்கள் அல்லது வெளிநாடுகளில் இருந்து உறவினர்கள் வரும்போது தங்குமிடத்தை முன்கூட்டியே பேசுவது நல்லது. அறைகள் எண்ணிக்கை, பெரியவர்களுக்கு தேவையான வசதிகள், வருகை நாள் போன்றவற்றை தெளிவாக பகிரலாம்.',
      },
      { type: 'heading', text: 'போக்குவரத்து' },
      {
        type: 'paragraph',
        text:
          'ரயில் நிலையம் அல்லது விமான நிலைய வருகை, தங்குமிடம் முதல் விழா இடம் வரை உள்ளூர் பயணம், குழுவாக பயணம் செய்வது போன்ற தேவைகள் இருக்கலாம். வருகை மற்றும் புறப்படும் விவரங்களை எளிய பட்டியலாக வைத்திருப்பது உதவும்.',
      },
      { type: 'heading', text: 'புகைப்படம் மற்றும் வீடியோ' },
      {
        type: 'paragraph',
        text:
          'புகைப்படம் மற்றும் வீடியோ விழா நினைவுகளை பாதுகாக்க உதவும். முக்கிய சடங்கு தருணங்களா, குடும்ப தருணங்களா, இரண்டுமா என்பதை முன்கூட்டியே பேசலாம். தம்பதியின் வசதியும் சடங்கின் அமைதியும் முதன்மையாக இருக்க வேண்டும்.',
      },
      { type: 'heading', text: 'திட்டமிடல் சரிபார்ப்பு பட்டியல்' },
      {
        type: 'list',
        items: [
          'சடங்கு வகை மற்றும் நேரத்தை வாத்தியார் / புரோகிதரிடம் உறுதிப்படுத்துங்கள்',
          'விருப்பமான தேதி அல்லது தேதி வரம்பைத் தேர்வு செய்யுங்கள்',
          'விருந்தினர் எண்ணிக்கை மற்றும் பெரியவர்களின் வசதியை கணக்கிடுங்கள்',
          'தேவையான சேவைகளைத் தேர்வு செய்யுங்கள்',
          'பயணம், தங்குமிடம், உணவு தேவைகளை தெளிவாக பகிருங்கள்',
          'திட்டமிடும் கோரிக்கையை அனுப்பும் முன் விவரங்களை சரிபாருங்கள்',
        ],
      },
      {
        type: 'faq',
        items: [
          {
            question: 'எப்போது திட்டமிடத் தொடங்கலாம்?',
            answer:
              'குடும்பத்திற்கு ஒரு தேதி வரம்பு மற்றும் விருந்தினர் எண்ணிக்கை பற்றிய ஆரம்ப கணக்கு கிடைத்தவுடன் திட்டமிடத் தொடங்கலாம்.',
          },
          {
            question: 'முதலில் எந்த விவரங்களை சேகரிக்க வேண்டும்?',
            answer:
              'விழா விருப்பம், குடும்பம் வாத்தியாரிடம் பகிர வேண்டிய விவரங்கள், தேதி வரம்பு, விருந்தினர் எண்ணிக்கை, பயண நகரம் மற்றும் தேவையான சேவைகளை முதலில் சேகரிக்கலாம்.',
          },
          {
            question: 'தேதி முடிவு ஆகவில்லை என்றாலும் திட்டமிடலாமா?',
            answer:
              'ஆம். தற்காலிக தேதி அல்லது தேதி வரம்புடன் திட்டமிடும் கோரிக்கையை அனுப்பலாம். தெளிவு கிடைத்த பிறகு அடுத்த படிகளை பேசலாம்.',
          },
          {
            question: 'எந்த சேவைகளை தேர்வு செய்யலாம்?',
            answer:
              'வாத்தியார் / புரோகிதர், பூஜை பொருட்கள், திருமண மண்டபம், கோவில் தொடர்பான திட்டமிடல் உதவி, உணவு, அலங்காரம், புகைப்படம், வீடியோ, நாதஸ்வரம், தங்குமிடம், போக்குவரத்து, அழைப்பிதழ்கள், நினைவுப் பரிசுகள் மற்றும் முழுமையான விழா ஏற்பாடு போன்ற சேவைகளை கோரிக்கையாக தேர்வு செய்யலாம்.',
          },
          {
            question: 'குடும்பங்களுக்கு இடையில் வழக்கங்கள் மாறுமா?',
            answer:
              'ஆம். குடும்ப சம்பிரதாயம், சமூக மரபுகள் மற்றும் வாத்தியார் / புரோகிதர் வழிகாட்டுதலின்படி சடங்குகள் மற்றும் நேரம் மாறுபடலாம்.',
          },
          {
            question: 'படிவம் அனுப்பினால் பதிவு உறுதி ஆகுமா?',
            answer:
              'இல்லை. படிவம் அனுப்புவது திட்டமிடும் கோரிக்கை மட்டுமே. கிடைக்கும் நிலை, சேவை வரம்பு, நேரம் மற்றும் அடுத்த படிகள் பின்னர் பேசப்படும்.',
          },
        ],
      },
    ],
    links: [
      { href: '/60th-marriage', label: 'தொடர்புடைய விழா பக்கம்' },
      { href: '/plan', label: 'திட்டமிடும் கோரிக்கை அனுப்புங்கள்' },
      { href: '/ta/blog', label: 'விழா வழிகாட்டிகளுக்கு திரும்புங்கள்' },
    ],
    cta: {
      title: 'திருக்கடையூரில் குடும்ப விழா திட்டமிடுகிறீர்களா?',
      text: 'உங்கள் குடும்ப விழா, தேதி மற்றும் தேவையான ஏற்பாடுகள் பற்றிய தகவல்களை பகிருங்கள்.',
      label: 'விழாவை திட்டமிடுங்கள்',
      href: '/plan',
    },
  },
  {
    slug: 'sashtiapthapoorthi-in-thirukadaiyur', translationKey: 'sashtiapthapoorthi-in-thirukadaiyur', locale: 'en',
    title: 'Sashtiapthapoorthi in Thirukadaiyur – What Families Should Know',
    seoTitle: 'Sashtiapthapoorthi in Thirukadaiyur – Family Planning Guide | MyThirumanam',
    description: 'Planning Sashtiapthapoorthi in Thirukadaiyur? Learn what families should know about the 60th marriage celebration, ceremony planning, guests, food, stay, travel and arrangements.',
    publishedAt: '2026-09-16', category: 'Celebration Planning', ceremony: '60th-marriage', status: 'published',
    excerpt: 'A practical family guide to planning Sashtiapthapoorthi and a 60th marriage celebration in Thirukadaiyur.',
    body: [
      { type: 'paragraph', text: 'Sashtiapthapoorthi is an important family milestone commonly associated with the completion of 60 years. Thirukadaiyur is a well-known destination for families who wish to bring relatives together for this meaningful 60th marriage celebration while planning the practical arrangements around it.' },
      { type: 'note', text: 'Ceremony practices, timing and sequence may vary by family tradition, community and the guidance of the Vadhyar or priest conducting the function.' },
      { type: 'heading', text: 'What Is Sashtiapthapoorthi?' },
      { type: 'paragraph', text: 'Sashtiapthapoorthi is commonly associated with completion of 60 years and is often marked as a major family milestone. The couple receives blessings from family and friends. The rituals are not identical for every family, so confirm the exact ceremony requirements with the Vadhyar or priest conducting the function.' },
      { type: 'heading', text: 'Why Do Families Choose Thirukadaiyur?' },
      { type: 'paragraph', text: 'Families often consider Thirukadaiyur for milestone celebrations such as a 60th Marriage or Sashtiapthapoorthi, 70th Marriage or Bheemaratha Shanthi, and 80th Marriage or Sathabhishekam. It is useful to plan the ceremony and the family gathering as connected, but separate, requirements.' },
      { type: 'heading', text: 'What Should Families Plan?' },
      { type: 'heading', text: 'Decide the Celebration Date Early' },
      { type: 'paragraph', text: 'Discuss a preferred date with your family and priest before confirming travel and arrangements. Keeping an alternative date in mind can make family coordination easier.' },
      { type: 'heading', text: 'Decide Whether You Need 1 Session or 2 Sessions' },
      { type: 'paragraph', text: 'Choose 1 Session or 2 Sessions based on your family’s preferred schedule and the guidance you receive. Session selection is separate from the ceremony, guest count and Basic or Premium plan; it does not change the plan definition.' },
      { type: 'heading', text: 'Estimate Your Guest Count' },
      { type: 'paragraph', text: 'An early estimate such as 50 guests, 100 guests or a custom guest count helps plan seating, food, rooms and travel. Guest count is planning information and does not alter the Basic or Premium arrangement definitions.' },
      { type: 'heading', text: 'Basic Plan' },
      { type: 'list', items: ['Pooja and Homam with 16 Kalasam, conducted in a common/shared space', 'Air-conditioned hall with minimal decoration and seating for up to 50 guests to receive Aashirvaadham', 'Breakfast with coffee and lunch', 'Rooms arranged for 10 guests; additional rooms are available at extra cost', 'One photo camera, one video camera, a synthetic album with 120 photos and acrylic pad, one pendrive with all photos, and one pendrive with edited video', 'Common Mangala Isai team'] },
      { type: 'heading', text: 'Premium Plan' },
      { type: 'list', items: ['Pooja and Homam with 16 Kalasam, conducted in a private space', 'Private hall, with Aashirvaadham conducted in the same space', 'Breakfast with coffee and lunch', 'Rooms arranged for 10 guests; additional rooms are available at extra cost', 'One photo camera, one video camera, a trendy synthetic album with 120 photos, one pendrive with all photos, and one pendrive with edited video', 'Moderate artificial flower decoration; additional decoration is available at extra cost', 'Special Mangala Isai team'] },
      { type: 'paragraph', text: 'Final arrangements, availability and pricing are confirmed after our team reviews your enquiry.' },
      { type: 'heading', text: 'Optional Additional Services' },
      { type: 'list', items: ['Transportation', 'Return Gifts'] },
      { type: 'heading', text: 'Accommodation Planning' },
      { type: 'paragraph', text: 'Consider how many people are staying, the needs of elderly guests, check-in and check-out times, distance from the venue, and transport between the stay and event location. These details help make the day more comfortable for the family.' },
      { type: 'heading', text: 'Food Arrangements' },
      { type: 'paragraph', text: 'Plan breakfast with coffee and lunch around the ceremony schedule. Share an approximate guest count, dietary requirements, and the needs of children and elderly guests so the serving schedule can be discussed practically.' },
      { type: 'heading', text: 'Photography and Videography' },
      { type: 'paragraph', text: 'Discuss important family photos, couple portraits, ceremony coverage, group photos, album expectations and video delivery before the event. A clear list of must-have moments helps the family enjoy the celebration without confusion.' },
      { type: 'heading', text: 'Transportation for Family Members' },
      { type: 'paragraph', text: 'Transportation is an optional add-on. Share each family group’s arrival location and time, number of travellers, accommodation location and return travel details when making an enquiry.' },
      { type: 'heading', text: 'What Information Should You Have Before Making an Enquiry?' },
      { type: 'list', items: ['Celebration type', 'Preferred date and an alternative date if available', 'Approximate guest count', '1 Session or 2 Sessions', 'Basic or Premium plan preference', 'Travelling-from city', 'Transportation requirement', 'Return Gifts requirement', 'Couple details', 'Primary contact information'] },
      { type: 'heading', text: 'When Should Families Start Planning?' },
      { type: 'paragraph', text: 'There is no single fixed planning period for every family. Starting earlier gives more time to coordinate the hall, food, accommodation, photography and transportation around the dates your family is considering.' },
      { type: 'heading', text: 'Keep Family Coordination Simple' },
      { type: 'paragraph', text: 'One primary family contact can collect decisions and questions, helping reduce repeated calls and uncertainty as arrangements are discussed.' },
      { type: 'faq', items: [
        { question: 'Is Sashtiapthapoorthi the same as a 60th marriage celebration?', answer: 'Sashtiapthapoorthi is commonly associated with completion of 60 years and is often discussed alongside a 60th marriage celebration. Exact observance and sequence can vary, so confirm them with your Vadhyar or priest.' },
        { question: 'Can we plan Sashtiapthapoorthi in Thirukadaiyur for 100 guests?', answer: 'Yes. Share an approximate count such as 100 guests in your enquiry so practical arrangements can be discussed.' },
        { question: 'Can we choose between Basic and Premium arrangements?', answer: 'Yes. Basic and Premium are separate arrangement choices; session selection and guest count remain separate planning details.' },
        { question: 'Are Transportation services available?', answer: 'Transportation can be requested as an optional additional service.' },
        { question: 'Can Return Gifts be arranged?', answer: 'Return Gifts can be requested as an optional additional service.' },
        { question: 'Are additional rooms available?', answer: 'Rooms are arranged for 10 guests in each plan. Additional rooms may be available at extra cost, subject to confirmation.' },
        { question: 'Does MyThirumanam arrange temple ceremonies directly?', answer: 'MyThirumanam is an independent event-management and coordination service. We are not an official or authorized temple website and are not affiliated with or endorsed by temple authorities. Temple-related ceremonies, timings, permissions, fees and facilities are governed by the respective temple authorities.' },
      ] },
    ],
    links: [{ href: '/60th-marriage', label: '60th Marriage in Thirukadaiyur' }, { href: '/70th-marriage', label: '70th Marriage in Thirukadaiyur' }, { href: '/80th-marriage', label: '80th Marriage in Thirukadaiyur' }, { href: '/plan', label: 'Plan Your Celebration' }, { href: '/blog', label: 'Back to guides' }],
    cta: { title: 'Planning Your Sashtiapthapoorthi in Thirukadaiyur?', text: 'MyThirumanam can help coordinate practical arrangements around your family celebration.', label: 'Plan Your Celebration', href: '/plan' },
  },
  {
    slug: 'sashtiapthapoorthi-in-thirukadaiyur', translationKey: 'sashtiapthapoorthi-in-thirukadaiyur', locale: 'ta',
    title: 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி – குடும்பங்கள் தெரிந்துகொள்ள வேண்டியவை',
    seoTitle: 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி – 60வது திருமண திட்டமிடல் வழிகாட்டி | MyThirumanam',
    description: 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி அல்லது 60வது திருமணத்தை திட்டமிடுகிறீர்களா? பூஜை, விருந்தினர் எண்ணிக்கை, உணவு, தங்குமிடம், பயணம் மற்றும் விழா ஏற்பாடுகள் குறித்து குடும்பங்கள் தெரிந்துகொள்ள வேண்டியவற்றை அறியுங்கள்.',
    publishedAt: '2026-09-16', category: 'விழா திட்டமிடல்', ceremony: '60th-marriage', status: 'published',
    excerpt: 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி அல்லது 60வது திருமணத்தை திட்டமிடும் குடும்பங்களுக்கு நடைமுறை வழிகாட்டி.',
    body: [
      { type: 'paragraph', text: 'சஷ்டியப்தபூர்த்தி என்பது பொதுவாக 60 ஆண்டுகள் நிறைவுடன் தொடர்புபடுத்தப்படும் முக்கியமான குடும்ப மைல்கல். இந்த அர்த்தமுள்ள 60வது திருமண விழாவிற்கு உறவினர்களை ஒன்றுசேர்க்க விரும்பும் குடும்பங்கள், விழாவுடன் தொடர்புடைய நடைமுறை ஏற்பாடுகளையும் முன்கூட்டியே திட்டமிடுவது உதவும்.' },
      { type: 'note', text: 'சடங்குகள், நேரம் மற்றும் வரிசை குடும்ப சம்பிரதாயம், சமூக மரபு மற்றும் விழாவை நடத்தும் வாத்தியார் அல்லது புரோகிதரின் வழிகாட்டுதலின்படி மாறுபடலாம்.' },
      { type: 'heading', text: 'சஷ்டியப்தபூர்த்தி என்றால் என்ன?' },
      { type: 'paragraph', text: 'சஷ்டியப்தபூர்த்தி பொதுவாக 60 ஆண்டுகள் நிறைவுடன் தொடர்புடையதாகக் கருதப்படுகிறது. தம்பதியர் குடும்பத்தினரிடமும் நண்பர்களிடமும் ஆசீர்வாதம் பெறும் முக்கிய தருணமாக இது அமையும். ஒவ்வொரு குடும்பத்திற்கும் சடங்கு முறை ஒரே மாதிரியாக இருக்காது; சரியான தேவைகளை விழாவை நடத்தும் வாத்தியார் அல்லது புரோகிதரிடம் உறுதிப்படுத்துங்கள்.' },
      { type: 'heading', text: 'குடும்பங்கள் திருக்கடையூரை ஏன் தேர்வு செய்கிறார்கள்?' },
      { type: 'paragraph', text: '60வது திருமணம் அல்லது சஷ்டியப்தபூர்த்தி, 70வது திருமணம் அல்லது பீமரத சாந்தி, 80வது திருமணம் அல்லது சதாபிஷேகம் போன்ற வாழ்க்கை மைல்கல் விழாக்களுக்கு பல குடும்பங்கள் திருக்கடையூரை கருதுகின்றனர். சடங்கு தேவைகளையும் குடும்பக் கூடல் தேவைகளையும் இணைந்த, ஆனால் தனித்தனி திட்டங்களாக வைத்துக் கொள்வது பயனுள்ளது.' },
      { type: 'heading', text: 'குடும்பங்கள் என்ன திட்டமிட வேண்டும்?' },
      { type: 'heading', text: 'விழா தேதியை முன்கூட்டியே முடிவு செய்யுங்கள்' },
      { type: 'paragraph', text: 'குடும்பத்தினருடனும் வாத்தியார் அல்லது புரோகிதருடனும் பேசி விருப்பத் தேதியை தேர்வு செய்யுங்கள். மாற்றுத் தேதி இருந்தால் பயணம் மற்றும் குடும்ப ஒருங்கிணைப்பு எளிதாகும்.' },
      { type: 'heading', text: '1 அமர்வா அல்லது 2 அமர்வுகளா என்பதை முடிவு செய்யுங்கள்' },
      { type: 'paragraph', text: 'குடும்பத்தின் நேர அட்டவணைக்கும் வழிகாட்டுதலுக்கும் ஏற்ப 1 அமர்வு அல்லது 2 அமர்வுகளைத் தேர்வு செய்யலாம். அமர்வு தேர்வு என்பது விழா வகை, விருந்தினர் எண்ணிக்கை மற்றும் அடிப்படை அல்லது பிரீமியம் திட்டத்திலிருந்து தனித்தது; திட்டத்தின் உள்ளடக்கத்தை அது மாற்றாது.' },
      { type: 'heading', text: 'விருந்தினர் எண்ணிக்கையை கணக்கிடுங்கள்' },
      { type: 'paragraph', text: '50 விருந்தினர்கள், 100 விருந்தினர்கள் அல்லது தனிப்பயன் விருந்தினர் எண்ணிக்கை போன்ற ஆரம்ப கணக்கு இருக்கலாம். இருக்கை, உணவு, அறைகள் மற்றும் பயணத்தை திட்டமிட இது உதவும்; விருந்தினர் எண்ணிக்கை அடிப்படை அல்லது பிரீமியம் திட்டத்தின் வரையறையை மாற்றாது.' },
      { type: 'heading', text: 'அடிப்படை திட்டம்' },
      { type: 'list', items: ['16 கலசத்துடன் பூஜை மற்றும் ஹோமம்; பொதுப் பகிர்வு இடத்தில் நடத்தப்படும்', 'குளிர்சாதன மண்டபம், குறைந்தபட்ச அலங்காரம், ஆசீர்வாதம் பெற 50 விருந்தினர்கள் வரை அமரும் வசதி', 'காபியுடன் காலை உணவு மற்றும் மதிய உணவு', '10 விருந்தினர்களுக்கு அறைகள்; கூடுதல் அறைகள் கூடுதல் கட்டணத்தில் கிடைக்கலாம்', 'ஒரு புகைப்பட கேமரா, ஒரு காணொளி கேமரா, 120 புகைப்படங்களுடன் அக்ரிலிக் பேடு கொண்ட சிந்தெடிக் ஆல்பம், அனைத்து புகைப்படங்களுக்கான ஒரு பென்டிரைவ், திருத்தப்பட்ட காணொளிக்கான ஒரு பென்டிரைவ்', 'பொதுவான மங்கள இசைக் குழு'] },
      { type: 'heading', text: 'பிரீமியம் திட்டம்' },
      { type: 'list', items: ['16 கலசத்துடன் பூஜை மற்றும் ஹோமம்; தனிப்பட்ட இடத்தில் நடத்தப்படும்', 'தனியார் மண்டபம்; அதே இடத்தில் ஆசீர்வாதம் நடைபெறும்', 'காபியுடன் காலை உணவு மற்றும் மதிய உணவு', '10 விருந்தினர்களுக்கு அறைகள்; கூடுதல் அறைகள் கூடுதல் கட்டணத்தில் கிடைக்கலாம்', 'ஒரு புகைப்பட கேமரா, ஒரு காணொளி கேமரா, 120 புகைப்படங்களுடன் டிரெண்டி சிந்தெடிக் ஆல்பம், அனைத்து புகைப்படங்களுக்கான ஒரு பென்டிரைவ், திருத்தப்பட்ட காணொளிக்கான ஒரு பென்டிரைவ்', 'மிதமான செயற்கை மலர் அலங்காரம்; கூடுதல் அலங்காரம் கூடுதல் கட்டணத்தில் கிடைக்கலாம்', 'சிறப்பு மங்கள இசைக் குழு'] },
      { type: 'paragraph', text: 'உங்கள் கோரிக்கையை எங்கள் குழு பரிசீலித்த பிறகு இறுதி ஏற்பாடுகள், கிடைக்கும் நிலை மற்றும் விலை உறுதிப்படுத்தப்படும்.' },
      { type: 'heading', text: 'விருப்ப கூடுதல் சேவைகள்' },
      { type: 'list', items: ['போக்குவரத்து', 'நினைவுப் பரிசுகள்'] },
      { type: 'heading', text: 'தங்குமிட திட்டமிடல்' },
      { type: 'paragraph', text: 'எத்தனை பேர் தங்குகிறார்கள், பெரியவர்களின் தேவைகள், செக்-இன் மற்றும் செக்-அவுட் நேரம், விழா இடத்திலிருந்து உள்ள தூரம், தங்குமிடத்திற்கும் விழா இடத்திற்கும் இடையிலான போக்குவரத்து ஆகியவற்றை கவனியுங்கள்.' },
      { type: 'heading', text: 'உணவு ஏற்பாடுகள்' },
      { type: 'paragraph', text: 'சடங்கு நேரத்துடன் இணைத்து காபியுடன் காலை உணவும் மதிய உணவும் திட்டமிடுங்கள். விருந்தினர் எண்ணிக்கை, உணவுக் கட்டுப்பாடுகள், குழந்தைகள் மற்றும் பெரியவர்களின் தேவைகள், பரிமாறும் நேரம் ஆகியவற்றை தெளிவாக பகிருங்கள்.' },
      { type: 'heading', text: 'புகைப்படம் மற்றும் காணொளி பதிவு' },
      { type: 'paragraph', text: 'முக்கிய குடும்பப் புகைப்படங்கள், தம்பதியர் படங்கள், சடங்கு பதிவு, குழுப் புகைப்படங்கள், ஆல்பம் எதிர்பார்ப்பு மற்றும் காணொளி வழங்கல் ஆகியவற்றை முன்கூட்டியே பேசுங்கள்.' },
      { type: 'heading', text: 'குடும்பத்தினருக்கான போக்குவரத்து' },
      { type: 'paragraph', text: 'போக்குவரத்து ஒரு விருப்ப கூடுதல் சேவை. வருகை இடம் மற்றும் நேரம், பயணிகள் எண்ணிக்கை, தங்குமிட இடம் மற்றும் திரும்பும் பயண விவரங்களை கோரிக்கையில் பகிருங்கள்.' },
      { type: 'heading', text: 'கோரிக்கை அனுப்பும் முன் என்ன தகவல்கள் தேவை?' },
      { type: 'list', items: ['விழா வகை', 'விருப்பத் தேதி மற்றும் மாற்றுத் தேதி', 'விருந்தினர் எண்ணிக்கை', '1 அமர்வு அல்லது 2 அமர்வுகள்', 'அடிப்படை அல்லது பிரீமியம் திட்ட விருப்பம்', 'எந்த நகரிலிருந்து பயணம்', 'போக்குவரத்து தேவை', 'நினைவுப் பரிசு தேவை', 'தம்பதியர் விவரங்கள்', 'முதன்மை தொடர்பு விவரம்'] },
      { type: 'heading', text: 'குடும்பங்கள் எப்போது திட்டமிடத் தொடங்க வேண்டும்?' },
      { type: 'paragraph', text: 'அனைத்து குடும்பங்களுக்கும் பொருந்தும் ஒரே கால அளவு இல்லை. மண்டபம், உணவு, தங்குமிடம், புகைப்படம் மற்றும் போக்குவரத்தை ஒருங்கிணைக்க முன்கூட்டிய திட்டமிடல் அதிக நேரம் தரும்.' },
      { type: 'heading', text: 'குடும்ப ஒருங்கிணைப்பை எளிமையாக வைத்துக்கொள்ளுங்கள்' },
      { type: 'paragraph', text: 'ஒரு முதன்மை குடும்பத் தொடர்பாளர் முடிவுகளையும் கேள்விகளையும் ஒருங்கிணைத்தால், பலரிடையே ஏற்படும் குழப்பத்தை குறைக்கலாம்.' },
      { type: 'faq', items: [
        { question: 'சஷ்டியப்தபூர்த்தி 60வது திருமண விழாவே தானா?', answer: 'சஷ்டியப்தபூர்த்தி பொதுவாக 60 ஆண்டுகள் நிறைவுடன் தொடர்புடையது; இது 60வது திருமண விழாவுடன் சேர்த்து பேசப்படுகிறது. சரியான நடைமுறையை வாத்தியார் அல்லது புரோகிதரிடம் உறுதிப்படுத்துங்கள்.' },
        { question: '100 விருந்தினர்களுக்கு சஷ்டியப்தபூர்த்தியை திட்டமிடலாமா?', answer: 'ஆம். 100 விருந்தினர்கள் போன்ற தோராயமான எண்ணிக்கையை கோரிக்கையில் பகிர்ந்தால் நடைமுறை ஏற்பாடுகளை பேசலாம்.' },
        { question: 'அடிப்படை மற்றும் பிரீமியம் ஏற்பாடுகளில் தேர்வு செய்யலாமா?', answer: 'ஆம். அடிப்படை மற்றும் பிரீமியம் தனித்தனி ஏற்பாடு தேர்வுகள்; அமர்வு மற்றும் விருந்தினர் எண்ணிக்கை தனிப்பட்ட திட்டமிடல் விவரங்கள்.' },
        { question: 'போக்குவரத்து சேவை கிடைக்குமா?', answer: 'போக்குவரத்தை விருப்ப கூடுதல் சேவையாக கோரலாம்.' },
        { question: 'நினைவுப் பரிசுகளை ஏற்பாடு செய்யலாமா?', answer: 'நினைவுப் பரிசுகளை விருப்ப கூடுதல் சேவையாக கோரலாம்.' },
        { question: 'கூடுதல் அறைகள் கிடைக்குமா?', answer: 'ஒவ்வொரு திட்டத்திலும் 10 விருந்தினர்களுக்கு அறைகள் ஏற்பாடு செய்யப்படும். கூடுதல் அறைகள் கூடுதல் கட்டணத்தில் கிடைக்கலாம்; உறுதிப்படுத்தல் அவசியம்.' },
        { question: 'MyThirumanam கோவில் சடங்குகளை நேரடியாக ஏற்பாடு செய்கிறதா?', answer: 'MyThirumanam ஒரு சுயாதீன விழா ஏற்பாடு மற்றும் ஒருங்கிணைப்பு சேவை. இது எந்தக் கோவிலின் அதிகாரப்பூர்வ அல்லது அங்கீகரிக்கப்பட்ட இணையதளமும் அல்ல; கோவில் நிர்வாகத்துடன் இணைந்ததுமல்ல அல்லது அவர்களால் அங்கீகரிக்கப்பட்டதுமல்ல. கோவில் தொடர்பான சடங்குகள், நேரங்கள், அனுமதிகள், கட்டணங்கள் மற்றும் வசதிகள் சம்பந்தப்பட்ட கோவில் நிர்வாகத்தின் விதிமுறைகளுக்கு உட்பட்டவை.' },
      ] },
    ],
    links: [{ href: '/plan', label: 'விழாவை திட்டமிடுங்கள்' }, { href: '/ta/blog', label: 'விழா வழிகாட்டிகளுக்கு திரும்புங்கள்' }],
    cta: { title: 'திருக்கடையூரில் சஷ்டியப்தபூர்த்தி திட்டமிடுகிறீர்களா?', text: 'உங்கள் குடும்ப விழாவைச் சுற்றிய நடைமுறை ஏற்பாடுகளை ஒருங்கிணைக்க MyThirumanam உதவலாம்.', label: 'விழாவை திட்டமிடுங்கள்', href: '/plan' },
  },
]

export function getPublishedBlogArticles(locale: BlogLocale) {
  return blogArticles
    .filter((article) => article.locale === locale && article.status === 'published')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function getPublishedBlogArticle(locale: BlogLocale, slug: string) {
  return getPublishedBlogArticles(locale).find((article) => article.slug === slug)
}

export function getBlogArticleByTranslationKey(locale: BlogLocale, translationKey: string) {
  return getPublishedBlogArticles(locale).find((article) => article.translationKey === translationKey)
}

export function getBlogPath(article: Pick<BlogArticle, 'locale' | 'slug'>) {
  return article.locale === 'en' ? `/blog/${article.slug}` : `/ta/blog/${article.slug}`
}

export function getBlogListingPath(locale: BlogLocale) {
  return locale === 'en' ? '/blog' : '/ta/blog'
}

export function getBlogUrl(article: Pick<BlogArticle, 'locale' | 'slug'>) {
  return `https://mythirumanam.in${getBlogPath(article)}`
}

export function getBlogListingUrl(locale: BlogLocale) {
  return `https://mythirumanam.in${getBlogListingPath(locale)}`
}

export function getBlogArticleAlternates(article: BlogArticle) {
  const url = getBlogUrl(article)
  const englishArticle = getBlogArticleByTranslationKey('en', article.translationKey)
  const tamilArticle = getBlogArticleByTranslationKey('ta', article.translationKey)
  const englishUrl = englishArticle ? getBlogUrl(englishArticle) : url

  return {
    canonical: url,
    languages: {
      ...(englishArticle ? { en: englishUrl } : {}),
      ...(tamilArticle ? { ta: getBlogUrl(tamilArticle) } : {}),
      'x-default': englishUrl,
    },
  }
}
