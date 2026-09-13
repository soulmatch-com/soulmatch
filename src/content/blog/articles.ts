export type BlogLocale = 'en' | 'ta'
export type BlogStatus = 'published' | 'draft'

export type BlogMetadata = {
  slug: string
  translationKey: string
  locale: BlogLocale
  title: string
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
