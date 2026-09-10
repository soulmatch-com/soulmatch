type NoticeLocale = 'en' | 'ta'
type NoticeVariant = 'short' | 'full' | 'planning'

const content = {
  en: {
    short: 'Independent event-management service. Not an official or authorized temple website and not affiliated with temple authorities.',
    full: 'MyThirumanam is an independent event management and coordination service. We are not an official or authorized website of any temple and are not affiliated with or endorsed by temple authorities. Temple-related ceremonies, timings, permissions, fees and facilities are governed by the respective temple authorities. MyThirumanam does not provide direct temple contact or represent the temple.',
    planning: 'MyThirumanam provides event-planning assistance only. Temple-related permissions, timings, fees and facilities remain subject to the respective temple authorities.',
  },
  ta: {
    short: 'சுயாதீன விழா ஏற்பாட்டு சேவை. எந்தக் கோவிலின் அதிகாரப்பூர்வ அல்லது அங்கீகரிக்கப்பட்ட இணையதளமும் அல்ல.',
    full: 'MyThirumanam ஒரு சுயாதீன விழா ஏற்பாடு மற்றும் ஒருங்கிணைப்பு சேவையாகும். இது எந்தக் கோவிலின் அதிகாரப்பூர்வ அல்லது அங்கீகரிக்கப்பட்ட இணையதளமும் அல்ல; கோவில் நிர்வாகத்துடன் இணைந்ததுமல்ல அல்லது அவர்களால் அங்கீகரிக்கப்பட்டதுமல்ல. கோவில் தொடர்பான சடங்குகள், நேரங்கள், அனுமதிகள், கட்டணங்கள் மற்றும் வசதிகள் அனைத்தும் சம்பந்தப்பட்ட கோவில் நிர்வாகத்தின் விதிமுறைகளுக்கு உட்பட்டவை. MyThirumanam கோவிலின் சார்பில் செயல்படுவதில்லை மற்றும் நேரடி கோவில் தொடர்பு சேவையையும் வழங்குவதில்லை.',
    planning: 'MyThirumanam விழா திட்டமிடல் உதவியை மட்டும் வழங்குகிறது. கோவில் தொடர்பான அனுமதிகள், நேரங்கள், கட்டணங்கள் மற்றும் வசதிகள் சம்பந்தப்பட்ட கோவில் நிர்வாகத்தின் விதிமுறைகளுக்கு உட்பட்டவை.',
  },
} as const

export function IndependentServiceNotice({ locale = 'en', variant = 'short', className = '' }: { locale?: NoticeLocale; variant?: NoticeVariant; className?: string }) {
  const baseClassName = variant === 'short' ? 'text-sm leading-6' : 'rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-stone-700'
  return <p lang={locale} className={`${baseClassName} ${className}`.trim()}>{content[locale][variant]}</p>
}
