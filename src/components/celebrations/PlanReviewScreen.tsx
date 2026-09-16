'use client'

import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Loader2, PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCeremony } from '@/lib/celebrations'
import { submitCelebrationEnquiry } from '@/lib/celebrations/client-submission'
import { buildPlanV2Submission } from '@/lib/celebrations/plan-v2-submission'
import {
  getCelebrationPlanDefinition,
  type CelebrationAddonCode,
} from '@/lib/celebrations/celebration-plans'
import { getCelebrationServicePresentation, type PublicCelebrationService } from '@/lib/celebrations/service-query'
import {
  formatPlanGuestCount,
  formatPlanDuration,
  type CelebrationPlanSelection,
} from '@/lib/celebrations/plan-v2'
import { TurnstileChallenge } from './TurnstileChallenge'
import { IndependentServiceNotice } from './IndependentServiceNotice'

export function PlanReviewScreen({
  services,
  selection,
  onBack,
  onEditPlan,
  onEditDetails,
  onSuccess,
}: {
  services: PublicCelebrationService[]
  selection: CelebrationPlanSelection
  onBack: () => void
  onEditPlan: () => void
  onEditDetails: () => void
  onSuccess: (enquiryId: string, enquiryReference: string) => void
}) {
  const [botToken, setBotToken] = useState<string>()
  const [challengeVersion, setChallengeVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string>()
  const submittingRef = useRef(false)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const challengeRequired = process.env.NODE_ENV === 'production' || Boolean(turnstileSiteKey)
  const handleBotToken = useCallback((token?: string) => setBotToken(token), [])
  const ceremony = getCeremony(selection.ceremony)
  const plan = getCelebrationPlanDefinition(selection.planType)
  const addonServices = selection.selectedAddonCodes
    .map((code) => services.find((service) => service.code === code))
    .filter((service): service is PublicCelebrationService => Boolean(service))
  const details = selection.details

  const submit = async () => {
    if (submittingRef.current || (challengeRequired && !botToken)) return
    const built = buildPlanV2Submission(selection, services)
    if (!built.ok) {
      setSubmitMessage(built.message)
      if (built.reason === 'invalid-details') onEditDetails()
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setSubmitMessage(undefined)
    const result = await submitCelebrationEnquiry(built.payload, botToken)
    submittingRef.current = false
    setSubmitting(false)
    if (result.ok || result.kind !== 'rate-limited') {
      setBotToken(undefined)
      setChallengeVersion((current) => current + 1)
    }
    if (result.ok) {
      onSuccess(result.enquiryId, result.enquiryReference)
      return
    }
    setSubmitMessage(messageForSubmissionFailure(result.kind))
  }

  if (!plan) return null

  return (
    <div className="mt-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Step 3</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-stone-950 sm:text-5xl">Review Your Celebration Plan</h1>
      <p lang="ta" className="mt-3 text-2xl font-semibold leading-9 text-amber-900">உங்கள் விழா திட்டத்தை சரிபார்க்கவும்</p>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">Please review your details before sending your enquiry.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ReviewCard title="Celebration" editLabel="Edit celebration plan" onEdit={onEditPlan}>
          <SummaryRows rows={[
            ['Ceremony', [ceremony?.title, ceremony?.traditionalName].filter(Boolean).join('\n')],
            ['Plan', plan.name],
            ['Expected Guests', formatPlanGuestCount(selection)],
            ['Session', formatPlanDuration(selection.ceremonyDuration)],
          ]} />
        </ReviewCard>

        <ReviewCard title="Plan Inclusions" editLabel="Edit plan" onEdit={onEditPlan}>
          <div className="space-y-5">
            {plan.sections.map((section) => (
              <section key={section.title}>
                <h3 className="font-bold text-stone-950">{section.title}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 leading-7 text-stone-700">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ))}
          </div>
        </ReviewCard>

        <ReviewCard title="Optional Add-ons" editLabel="Edit optional add-ons" onEdit={onEditPlan}>
          {addonServices.length > 0 ? (
            <ul className="space-y-2">
              {addonServices.map((service) => <li key={service.id} className="rounded-xl bg-amber-50 px-3 py-2 font-medium">{getAddonLabel(service.code as CelebrationAddonCode, getCelebrationServicePresentation(service).name)}</li>)}
            </ul>
          ) : (
            <p className="text-stone-600">No optional add-ons selected.</p>
          )}
        </ReviewCard>

        <ReviewCard title="Event & Couple" editLabel="Edit event and couple details" onEdit={onEditDetails}>
          <SummaryRows rows={[
            ['Preferred Date', displayDate(details?.preferredDate)],
            ...(details?.alternativeDate ? [['Alternative Date', displayDate(details.alternativeDate)] as [string, string]] : []),
            ['Travelling From', details?.travellingFrom ?? 'Not provided'],
            ['Expected Guests', formatPlanGuestCount(selection)],
            ...(details?.husbandName ? [['Husband Name', details.husbandName] as [string, string]] : []),
            ...(details?.wifeName ? [['Wife Name', details.wifeName] as [string, string]] : []),
            ...(details?.husbandDob ? [['Husband DOB', displayDate(details.husbandDob)] as [string, string]] : []),
            ...(details?.wifeDob ? [['Wife DOB', displayDate(details.wifeDob)] as [string, string]] : []),
            ...traditionalRows(selection),
          ]} />
        </ReviewCard>

        <ReviewCard title="Contact Details" editLabel="Edit contact details" onEdit={onEditDetails}>
          <SummaryRows rows={[
            ['Contact Name', details?.contactName ?? 'Not provided'],
            ['Mobile', details?.mobile ?? 'Not provided'],
            ...(details?.email ? [['Email', details.email] as [string, string]] : []),
            ['Relationship', details?.relationship ?? 'Not provided'],
            ['Preferred Contact Method', contactMethodLabel(details?.preferredContactMethod)],
            ['Terms & Privacy', details?.termsPrivacyAcknowledged ? 'Acknowledged' : 'Not acknowledged'],
          ]} />
        </ReviewCard>

        {details?.additionalRequirements?.trim() && (
          <ReviewCard title="Additional Requirements" editLabel="Edit additional requirements" onEdit={onEditDetails}>
            <p className="whitespace-pre-wrap break-words leading-7 text-stone-700">{details.additionalRequirements.trim()}</p>
          </ReviewCard>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-stone-700">
        <p className="leading-7">Final arrangements, service availability and pricing are confirmed only after our team reviews your enquiry.</p>
        <div className="mt-3">
          <IndependentServiceNotice variant="planning" />
        </div>
      </div>

      {turnstileSiteKey ? (
        <TurnstileChallenge key={challengeVersion} siteKey={turnstileSiteKey} onTokenChange={handleBotToken} />
      ) : challengeRequired ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Verification is temporarily unavailable.</p>
      ) : null}

      {submitMessage && (
        <div role="alert" aria-live="assertive" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-800">
          {submitMessage}
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting} className="min-h-12 border-amber-700 px-5 font-bold text-amber-800 hover:bg-amber-50">
          Back to Details
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={submitting || (challengeRequired && !botToken)} aria-busy={submitting} className="min-h-12 bg-amber-800 px-5 font-bold hover:bg-amber-900">
          {submitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
          {submitting ? 'Sending Enquiry...' : 'Submit Enquiry'}
        </Button>
      </div>
    </div>
  )
}

function ReviewCard({ title, editLabel, onEdit, children }: { title: string; editLabel: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section aria-labelledby={`review-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="rounded-3xl border border-amber-200 bg-white p-5 shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-amber-100 pb-4">
        <h2 id={`review-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-2xl font-bold text-stone-950">{title}</h2>
        <button type="button" onClick={onEdit} aria-label={editLabel} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
          <PencilLine aria-hidden="true" className="h-4 w-4" />
          Edit
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function SummaryRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="space-y-4">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
          <dt className="font-bold text-amber-900">{label}</dt>
          <dd className="whitespace-pre-wrap break-words text-stone-700">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function displayDate(value?: string) {
  if (!value) return 'Not provided'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function contactMethodLabel(value?: string) {
  if (value === 'phone') return 'Phone'
  if (value === 'whatsapp') return 'WhatsApp'
  if (value === 'email') return 'Email'
  return 'Not provided'
}

function getAddonLabel(code: CelebrationAddonCode, fallback: string) {
  if (code === 'transportation') return 'Transportation'
  if (code === 'return_gifts') return 'Return Gifts'
  return fallback
}

function traditionalRows(selection: CelebrationPlanSelection): Array<[string, string]> {
  const details = selection.details
  if (!details) return []
  return [
    ['Husband Nakshatra', details.husbandNakshatra],
    ['Husband Rasi', details.husbandRasi],
    ['Wife Nakshatra', details.wifeNakshatra],
    ['Wife Rasi', details.wifeRasi],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()))
}

function messageForSubmissionFailure(kind: string) {
  if (kind === 'validation') return 'Please check the highlighted details and try again.'
  if (kind === 'too-large') return 'Your request contains too much information. Please shorten the requirements and try again.'
  if (kind === 'rate-limited') return 'Too many requests. Please wait a little while and try again.'
  if (kind === 'challenge') return "We couldn't verify the submission. Please complete the verification and try again."
  if (kind === 'verification-unavailable') return 'Verification is temporarily unavailable. Please try again shortly.'
  if (kind === 'network') return "We couldn't send your enquiry right now. Please check your connection and try again."
  return "We couldn't send your enquiry right now. Please try again."
}
