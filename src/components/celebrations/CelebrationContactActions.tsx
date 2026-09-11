import Link from 'next/link'
import { ArrowRight, MessageCircle, Phone } from 'lucide-react'
import { businessContactLinks } from '@/lib/business-contact'

type CelebrationContactActionsProps = {
  variant?: 'inline' | 'mobile-sticky'
  tone?: 'dark' | 'light'
  locale?: 'en' | 'ta'
  showPlan?: boolean
  showWhatsapp?: boolean
  showCall?: boolean
}

const copy = {
  en: { plan: 'Plan Celebration', whatsapp: 'WhatsApp', call: 'Call Us', whatsappLabel: 'Contact MyThirumanam on WhatsApp', callLabel: 'Call MyThirumanam' },
  ta: { plan: 'விழாவை திட்டமிடுங்கள்', whatsapp: 'WhatsApp', call: 'அழைக்கவும்', whatsappLabel: 'WhatsApp மூலம் MyThirumanam-ஐ தொடர்பு கொள்ளுங்கள்', callLabel: 'MyThirumanam-ஐ அழைக்கவும்' },
} as const

export function CelebrationContactActions({ variant = 'inline', tone = 'dark', locale = 'en', showPlan = true, showWhatsapp = true, showCall = true }: CelebrationContactActionsProps) {
  const labels = copy[locale]
  const canWhatsapp = showWhatsapp && !!businessContactLinks.whatsappHref
  const canCall = showCall && !!businessContactLinks.callHref
  const planClassName = tone === 'dark'
    ? 'bg-amber-400 text-stone-950 hover:bg-amber-300 focus-visible:outline-white'
    : 'bg-amber-800 text-white hover:bg-amber-900 focus-visible:outline-amber-700'
  const secondaryClassName = tone === 'dark'
    ? 'border-amber-300 text-amber-100 hover:bg-white/10 focus-visible:outline-white'
    : 'border-amber-300 text-amber-900 hover:bg-amber-100 focus-visible:outline-amber-700'

  if (variant === 'mobile-sticky') {
    if (!canWhatsapp && !canCall) return null
    return <nav aria-label="Celebration contact actions" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"><div className="mx-auto grid max-w-md grid-cols-3 gap-2">{showPlan && <Link href="/plan" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-amber-800 px-3 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">{labels.plan}</Link>}{canWhatsapp && <a href={businessContactLinks.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={labels.whatsappLabel} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"><MessageCircle aria-hidden="true" className="h-4 w-4" />{labels.whatsapp}</a>}{canCall && <a href={businessContactLinks.callHref} aria-label={labels.callLabel} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-sm font-bold text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"><Phone aria-hidden="true" className="h-4 w-4" />{labels.call}</a>}</div></nav>
  }

  return <div lang={locale === 'ta' ? 'ta' : undefined} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{showPlan && <Link href="/plan" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 ${planClassName}`}>{labels.plan}<ArrowRight aria-hidden="true" className="h-5 w-5" /></Link>}{canWhatsapp && <a href={businessContactLinks.whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={labels.whatsappLabel} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-6 py-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 ${secondaryClassName}`}><MessageCircle aria-hidden="true" className="h-5 w-5" />{labels.whatsapp}</a>}{canCall && <a href={businessContactLinks.callHref} aria-label={labels.callLabel} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-6 py-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 ${secondaryClassName}`}><Phone aria-hidden="true" className="h-5 w-5" />{labels.call}</a>}</div>
}
