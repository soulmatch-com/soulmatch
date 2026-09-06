import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, HeartHandshake, MessageCircle, ScrollText, SlidersHorizontal } from 'lucide-react'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { CelebrationServices } from '@/components/celebrations/CelebrationServices'
import { CeremonyGrid } from '@/components/celebrations/CeremonyGrid'
import { PlanningSteps } from '@/components/celebrations/PlanningSteps'
import { JsonLd } from '@/components/seo/JsonLd'
import { loadCelebrationServices } from '@/lib/celebrations/page-data'

const url = 'https://mythirumanam.in/about'
const description = 'Learn how MyThirumanam helps families plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur with flexible, family-focused support.'

const tamilContent = {
  hero:
    'திருக்கடையூரில் குடும்பத்தின் முக்கியமான திருமண விழாக்களை மனநிறைவுடன் திட்டமிட உதவுகிறோம்.',

  meaningfulHeading:
    'அர்த்தமுள்ள குடும்ப விழாக்களை எளிதாக திட்டமிட உதவுகிறோம்',

  meaningfulIntro:
    'MyThirumanam மூலம் திருக்கடையூரில் 60ஆம், 70ஆம் மற்றும் 80ஆம் திருமண விழாக்களை குடும்பங்கள் எளிதாக திட்டமிட உதவுகிறோம்.',

  meaningfulDetail:
    'பெற்றோர், தாத்தா-பாட்டி, உறவினர் அல்லது உங்கள் குடும்பத்திற்காக விழா ஏற்பாடு செய்தாலும், தேவையான சேவைகளை ஒரே இடத்தில் தேர்வு செய்து உங்கள் தேவைகளை எங்களிடம் பகிரலாம்.',

  placeHeading:
    'திருமண வாழ்வின் முக்கிய தருணங்களுக்கு திருக்கடையூர்',

  placeIntro:
    'ஷஷ்டியப்த பூர்த்தி, பீமரத சாந்தி மற்றும் சதாபிஷேகம் போன்ற திருமண வாழ்வின் முக்கிய நிகழ்வுகளை கொண்டாட பல குடும்பங்கள் திருக்கடையூரை தேர்வு செய்கிறார்கள்.',

  placeDetail:
    'ஒவ்வொரு குடும்பத்தின் சம்பிரதாயமும் மாறுபடலாம். சடங்குகள், பூஜை முறைகள் மற்றும் நேரம் போன்றவை குடும்ப வழக்கம், சமூக மரபுகள் மற்றும் வாத்தியார் / புரோகிதர் வழிகாட்டுதலின்படி மாறலாம்.',

  services:
    'விழா ஏற்பாடுகள் முதல் உணவு, தங்குமிடம், புகைப்படம், வீடியோ மற்றும் போக்குவரத்து வரை, உங்கள் குடும்பத் தேவைக்கு ஏற்ப சேவைகளை தேர்வு செய்யலாம்.',

  steps:
    'உங்கள் விழாவை தேர்வு செய்யுங்கள் → தேவைகளை பகிருங்கள் → சேவைகளை தேர்வு செய்யுங்கள் → திட்டமிடும் கோரிக்கையை அனுப்புங்கள்',

  nearFar:
    'தமிழ்நாட்டில் இருந்தாலும், இந்தியாவின் வேறு மாநிலத்தில் இருந்தாலும், வெளிநாட்டில் இருந்தாலும் குடும்ப விழாவிற்கான தேவைகளை எளிதாக பகிர்ந்து திட்டமிட முடியும்.',

  storyHeading:
    'வாழ்க்கைத்துணையை தேடும் பயணத்திலிருந்து வாழ்க்கையின் முக்கிய கொண்டாட்டங்கள் வரை',

  storyDetail:
    'குடும்பங்களின் திருமண பயணத்திற்கு உதவிய MyThirumanam, இன்று திருக்கடையூரில் நடைபெறும் 60ஆம், 70ஆம் மற்றும் 80ஆம் திருமண விழாக்களையும் திட்டமிட உதவுகிறது.',

  finalHeading:
    'திருக்கடையூரில் குடும்ப விழா திட்டமிடுகிறீர்களா?',

  finalDetail:
    'உங்கள் விழா மற்றும் தேவைகளை எங்களிடம் பகிருங்கள்.',
} as const;

export const metadata: Metadata = {
  title: 'About MyThirumanam | Thirukadaiyur Celebrations',
  description,
  alternates: { canonical: url },
  openGraph: { title: 'About MyThirumanam | Thirukadaiyur Celebrations', description, url, siteName: 'MyThirumanam', type: 'website' },
}

const steps = [
  ['Choose Your Celebration', 'Select 60th, 70th, 80th marriage or choose Need Guidance.'],
  ['Tell Us About Your Family', 'Share your preferred date, guest requirements and celebration details.'],
  ['Select the Services You Need', 'Choose from available Thirukadaiyur celebration services.'],
  ['Submit Your Planning Request', 'Our team can then understand your requirements and help coordinate the next steps.'],
] as const

const values = [
  [HeartHandshake, 'Family First', "Every celebration is planned around the family's requirements."],
  [ScrollText, 'Respect for Traditions', 'We understand that customs differ between families and communities.'],
  [SlidersHorizontal, 'Flexible Planning', 'Choose only the services you need or ask us for guidance.'],
  [MessageCircle, 'Clear Communication', 'We aim to keep the planning process straightforward and understandable.'],
] as const

export default async function AboutPage() {
  const { services, failed } = await loadCelebrationServices()
  return <><JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About MyThirumanam', url, description }} /><main className="min-h-screen bg-[#fffaf3] text-stone-900">
    <div className="mx-auto max-w-6xl px-4 sm:px-6"><CelebrationBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About Us' }]} /></div>
    <section className="overflow-hidden bg-gradient-to-br from-[#5d1720] via-[#8f2d2e] to-[#bd6b2f] text-white"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24"><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">Our purpose</p><h1 className="mt-4 text-4xl font-bold sm:text-5xl">About MyThirumanam</h1><p className="mt-5 max-w-3xl text-xl leading-8 text-amber-50">Helping families celebrate life&apos;s meaningful milestones in Thirukadaiyur.</p><p lang="ta" className="mt-4 max-w-3xl text-lg leading-8 text-amber-100">{tamilContent.hero}</p><Link href="/plan" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Start Planning <ArrowRight aria-hidden="true" className="h-5 w-5" /></Link></div></section>

    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Who we are</p><h2 className="mt-3 text-3xl font-bold">Celebrations Made Meaningful</h2><p className="mt-5 leading-7 text-stone-700">MyThirumanam helps families plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur. We aim to make the planning process simpler by bringing ceremony-related requirements and supporting services together in one place.</p><p className="mt-4 leading-7 text-stone-700">Whether you are arranging a celebration for your parents, grandparents, relatives or your own family, you can tell us what you need and choose the services that suit your celebration.</p></div><div lang="ta" className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8"><h3 className="text-xl font-bold text-amber-900">{tamilContent.meaningfulHeading}</h3><p className="mt-4 leading-8 text-stone-700">{tamilContent.meaningfulIntro}</p><p className="mt-4 leading-8 text-stone-700">{tamilContent.meaningfulDetail}</p></div></section>

    <section className="border-y border-amber-200 bg-white py-16"><div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Why Thirukadaiyur</p><h2 className="mt-3 text-3xl font-bold">A Special Place for Marriage Milestones</h2><p className="mt-5 leading-7 text-stone-700">Thirukadaiyur is well known among families who choose to celebrate important marriage milestones such as Sashtiapthapoorthi, Bheemaratha Shanthi and Sathabhishekam.</p><p className="mt-4 leading-7 text-stone-700">Every family&apos;s traditions may be different. Ceremony details, rituals and timing can vary based on family custom, community traditions and Vadhyar or priest guidance.</p><p className="mt-4 leading-7 text-stone-700">Our role is to help make the surrounding planning and coordination easier for your family.</p></div><div lang="ta" className="rounded-3xl bg-amber-50 p-6 sm:p-8"><h3 className="text-xl font-bold text-amber-900">{tamilContent.placeHeading}</h3><p className="mt-4 leading-8 text-stone-700">{tamilContent.placeIntro}</p><p className="mt-4 leading-8 text-stone-700">{tamilContent.placeDetail}</p></div></div></section>

    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Milestone ceremonies</p><h2 className="mt-3 text-3xl font-bold">Celebrations We Help Families Plan</h2><div className="mt-9"><CeremonyGrid /></div></section>

    <section className="border-y border-amber-200 bg-white py-16"><div className="mx-auto max-w-6xl px-4 sm:px-6"><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">What we help with</p><h2 className="mt-3 max-w-4xl text-3xl font-bold">Everything Your Family Needs, Based on Your Requirements</h2><p className="mt-5 max-w-3xl leading-7 text-stone-700">Families can choose the services they need for their celebration rather than being forced into a fixed package.</p><p className="mt-3 max-w-3xl leading-7 text-stone-700">From ceremony arrangements and hospitality to photography and transportation, choose the support that suits your family&apos;s plans.</p><p lang="ta" className="mt-4 max-w-4xl leading-8 text-stone-600">{tamilContent.services}</p><div className="mt-9">{failed ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">Available services could not be loaded right now. Please try again shortly.</p> : <CelebrationServices services={services} />}</div></div></section>

    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">How we work</p><h2 className="mt-3 text-3xl font-bold">Simple Planning. Clear Next Steps.</h2><div className="mt-9"><PlanningSteps steps={steps} /></div><p lang="ta" className="mt-8 rounded-2xl bg-amber-50 p-5 text-center leading-8 text-stone-700">{tamilContent.steps}</p></section>

    <section className="bg-amber-50 py-16"><div className="mx-auto max-w-6xl px-4 sm:px-6"><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Our approach</p><h2 className="mt-3 text-3xl font-bold">Family-Focused From the First Step</h2><div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{values.map(([Icon, title, text]) => <article key={title} className="rounded-2xl bg-white p-5 shadow-sm"><Icon aria-hidden="true" className="h-7 w-7 text-amber-800" /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{text}</p></article>)}</div><p className="mt-8 max-w-4xl rounded-2xl border border-amber-200 bg-white p-5 leading-7 text-stone-700">The information submitted through the celebration enquiry is used to understand and respond to your planning requirements.</p></div></section>

    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Who we help</p><h2 className="mt-3 text-3xl font-bold">Planning From Near or Far</h2><p className="mt-5 leading-7 text-stone-700">A celebration may be organised by children planning for their parents, relatives helping the family, family members living outside Tamil Nadu or abroad, or the couple and family themselves.</p><p className="mt-4 leading-7 text-stone-700">MyThirumanam is designed to make it easier to communicate the family&apos;s needs regardless of who is coordinating the celebration.</p><p lang="ta" className="mt-5 rounded-2xl bg-amber-50 p-5 leading-8 text-stone-700">{tamilContent.nearFar}</p></div><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Our story</p><h2 className="mt-3 text-3xl font-bold">From Life Partners to Life&apos;s Milestones</h2><p className="mt-5 leading-7 text-stone-700">MyThirumanam began with a focus on helping families through the matrimonial journey.</p><p className="mt-4 leading-7 text-stone-700">As families grow, the meaningful moments continue.</p><p className="mt-4 leading-7 text-stone-700">Today, alongside Matrimony, MyThirumanam helps families plan milestone marriage celebrations in Thirukadaiyur — from finding a life partner to celebrating decades of togetherness.</p><div lang="ta" className="mt-5 rounded-2xl bg-white p-5 leading-8 text-stone-700 shadow-sm"><p>{tamilContent.storyHeading}</p><p className="mt-3">{tamilContent.storyDetail}</p></div></div></section>

    <section className="bg-gradient-to-r from-[#681c24] to-[#9a3b2f] py-16 text-white"><div className="mx-auto max-w-4xl px-4 text-center sm:px-6"><h2 className="text-3xl font-bold">Planning a Celebration in Thirukadaiyur?</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-amber-50">Tell us about your family&apos;s celebration and the services you need. Start with a simple planning request.</p><div lang="ta" className="mt-4 leading-8 text-amber-100"><p>{tamilContent.finalHeading}</p><p>{tamilContent.finalDetail}</p></div><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/plan" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Start Planning</Link><Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 px-6 py-3 font-bold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Explore Celebrations</Link></div></div></section>
  </main></>
}
