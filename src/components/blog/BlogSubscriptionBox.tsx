'use client'

import { FormEvent, useId, useRef, useState } from 'react'

type BlogSubscriptionLocale = 'en' | 'ta'
type BlogSubscriptionSource = 'blog_listing' | 'blog_article'
type FormState = 'idle' | 'submitting' | 'success' | 'error'

type SubscriptionCopy = {
  heading: string
  description: string
  emailLabel: string
  placeholder: string
  consent: string
  button: string
  footer: string
  subscribed: string
  alreadySubscribed: string
  resubscribed: string
  genericError: string
  rateLimitError: string
  requiredEmail: string
  invalidEmail: string
  requiredConsent: string
}

const copy: Record<BlogSubscriptionLocale, SubscriptionCopy> = {
  en: {
    heading: 'Get Thirukadaiyur Planning Guides',
    description: 'Receive new celebration guides, checklists and practical planning tips by email.',
    emailLabel: 'Email address',
    placeholder: 'Enter your email address',
    consent: 'I agree to receive useful guides and updates from MyThirumanam.',
    button: 'Subscribe',
    footer: 'You can unsubscribe at any time.',
    subscribed: "Thank you for subscribing. We'll send you new planning guides and updates.",
    alreadySubscribed: "You're already subscribed to MyThirumanam updates.",
    resubscribed: "Welcome back. You're subscribed to MyThirumanam updates again.",
    genericError: "We couldn't complete your subscription. Please try again.",
    rateLimitError: 'Too many subscription attempts. Please try again later.',
    requiredEmail: 'Enter your email address.',
    invalidEmail: 'Enter a valid email address.',
    requiredConsent: 'Consent is required to subscribe.',
  },
  ta: {
    heading: 'புதிய திருக்கடையூர் வழிகாட்டிகளை பெறுங்கள்',
    description: 'விழா திட்டமிடல் குறிப்புகள், checklist மற்றும் புதிய வழிகாட்டிகளை மின்னஞ்சலில் பெறுங்கள்.',
    emailLabel: 'மின்னஞ்சல் முகவரி',
    placeholder: 'உங்கள் மின்னஞ்சல் முகவரி',
    consent: 'MyThirumanam வழங்கும் பயனுள்ள வழிகாட்டிகள் மற்றும் தகவல்களை பெற நான் சம்மதிக்கிறேன்.',
    button: 'Subscribe',
    footer: 'எப்போது வேண்டுமானாலும் unsubscribe செய்யலாம்.',
    subscribed: 'நன்றி. புதிய திட்டமிடல் வழிகாட்டிகள் மற்றும் தகவல்கள் உங்கள் மின்னஞ்சலுக்கு அனுப்பப்படும்.',
    alreadySubscribed: 'இந்த மின்னஞ்சல் ஏற்கனவே MyThirumanam updates-க்கு subscribe செய்யப்பட்டுள்ளது.',
    resubscribed: 'மீண்டும் வரவேற்கிறோம். MyThirumanam updates-க்கு மீண்டும் subscribe செய்யப்பட்டுள்ளீர்கள்.',
    genericError: 'சந்தாவை முடிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    rateLimitError: 'மிக அதிகமான subscription முயற்சிகள் உள்ளன. சிறிது நேரம் கழித்து முயற்சிக்கவும்.',
    requiredEmail: 'உங்கள் மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
    invalidEmail: 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
    requiredConsent: 'Subscribe செய்ய சம்மதம் அவசியம்.',
  },
}

function validateEmail(email: string, messages: SubscriptionCopy) {
  const normalized = email.trim()
  if (!normalized) return messages.requiredEmail
  if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return messages.invalidEmail
  return null
}

export function BlogSubscriptionBox({ locale, source }: { locale: BlogSubscriptionLocale; source: BlogSubscriptionSource }) {
  const text = copy[locale]
  const emailId = useId()
  const consentId = useId()
  const statusId = useId()
  const submittingRef = useRef(false)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<FormState>('idle')
  const [message, setMessage] = useState('')
  const [emailError, setEmailError] = useState('')
  const [consentError, setConsentError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const nextEmailError = validateEmail(email, text)
    const nextConsentError = consent ? '' : text.requiredConsent
    setEmailError(nextEmailError ?? '')
    setConsentError(nextConsentError)
    setMessage('')
    if (nextEmailError || nextConsentError) {
      setState('error')
      return
    }

    submittingRef.current = true
    setState('submitting')
    try {
      const response = await fetch('/api/notifications/subscribers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: true, locale, source }),
      })
      if (!response.ok) {
        setMessage(response.status === 429 ? text.rateLimitError : text.genericError)
        setState('error')
        return
      }
      const result: unknown = await response.json()
      const status = result && typeof result === 'object' && 'status' in result ? result.status : undefined
      const successMessage = status === 'subscribed' ? text.subscribed : status === 'already_subscribed' ? text.alreadySubscribed : status === 'resubscribed' ? text.resubscribed : null
      if (!successMessage) {
        setMessage(text.genericError)
        setState('error')
        return
      }
      setEmail('')
      setMessage(successMessage)
      setState('success')
    } catch {
      setMessage(text.genericError)
      setState('error')
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <section aria-labelledby={`${emailId}-heading`} className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
      <h2 id={`${emailId}-heading`} className="font-serif text-2xl font-bold text-stone-950 sm:text-3xl">{text.heading}</h2>
      <p className="mt-3 max-w-2xl leading-7 text-stone-700">{text.description}</p>
      {state === 'success' ? (
        <p id={statusId} role="status" aria-live="polite" className="mt-6 rounded-xl border border-emerald-200 bg-white p-4 font-medium leading-7 text-stone-800">{message}</p>
      ) : (
        <form className="mt-6" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label htmlFor={emailId} className="mb-2 block font-semibold text-stone-900">{text.emailLabel}</label>
              <input id={emailId} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} placeholder={text.placeholder} aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? `${emailId}-error` : undefined} className="min-h-12 w-full rounded-xl border border-amber-300 bg-white px-4 text-stone-950 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700" />
              {emailError ? <p id={`${emailId}-error`} className="mt-2 text-sm font-medium text-red-800">{emailError}</p> : null}
            </div>
            <button type="submit" disabled={state === 'submitting'} className="min-h-12 rounded-xl bg-[#681c24] px-6 py-3 font-bold text-white hover:bg-[#52151c] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:mt-8">
              {state === 'submitting' ? '…' : text.button}
            </button>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <input id={consentId} checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 rounded border-amber-400 accent-[#681c24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700" aria-invalid={consentError ? true : undefined} aria-describedby={consentError ? `${consentId}-error` : undefined} />
            <div>
              <label htmlFor={consentId} className="cursor-pointer leading-6 text-stone-800">{text.consent}</label>
              {consentError ? <p id={`${consentId}-error`} className="mt-1 text-sm font-medium text-red-800">{consentError}</p> : null}
            </div>
          </div>
          {state === 'error' && message ? <p id={statusId} role="alert" aria-live="assertive" className="mt-4 text-sm font-medium text-red-800">{message}</p> : null}
          <p className="mt-4 text-sm text-stone-600">{text.footer}</p>
        </form>
      )}
    </section>
  )
}
