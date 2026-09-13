'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ZodIssue } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCelebrationDateBounds } from '@/lib/celebrations/date'
import { getCelebrationPlanDefinition } from '@/lib/celebrations/celebration-plans'
import { createPlanV2DetailsSchema, type CelebrationPlanDetailsDraft } from '@/lib/celebrations/plan-v2-details'
import {
  formatPlanGuestCount,
  formatPlanDuration,
  type CelebrationPlanSelection,
} from '@/lib/celebrations/plan-v2'

type DetailErrors = Partial<Record<keyof CelebrationPlanDetailsDraft, string>>
const fieldClass = 'h-12 border-amber-200 text-base focus-visible:ring-amber-700'
const selectClass = 'h-12 w-full rounded-md border border-amber-200 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-700'

export function PlanDetailsScreen({
  selection,
  onSelectionChange,
  onBack,
  onContinue,
  onChangePlan,
}: {
  selection: CelebrationPlanSelection
  onSelectionChange: (selection: CelebrationPlanSelection) => void
  onBack: () => void
  onContinue: () => void
  onChangePlan: () => void
}) {
  const [traditionalOpen, setTraditionalOpen] = useState(false)
  const [errors, setErrors] = useState<DetailErrors>({})
  const { today, minDateOfBirth, maxDateOfBirth } = getCelebrationDateBounds()
  const details = selection.details ?? {}
  const plan = getCelebrationPlanDefinition(selection.planType)

  const updateDetails = <TField extends keyof CelebrationPlanDetailsDraft>(field: TField, value: CelebrationPlanDetailsDraft[TField]) => {
    onSelectionChange({ ...selection, details: { ...details, [field]: value } })
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validateAndContinue = () => {
    const validation = createPlanV2DetailsSchema().safeParse(details)
    if (!validation.success) {
      const nextErrors: DetailErrors = {}
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof CelebrationPlanDetailsDraft
        nextErrors[field] = issue.message
      }
      setErrors(nextErrors)
      focusFirstInvalid(validation.error.issues)
      return
    }
    onSelectionChange({ ...selection, details: validation.data })
    onContinue()
  }

  return (
    <div className="mt-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Step 3</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-stone-950 sm:text-5xl">Event &amp; Contact Details</h1>
      <p lang="ta" className="mt-3 text-2xl font-semibold leading-9 text-amber-900">விழா மற்றும் தொடர்பு விவரங்கள்</p>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">Share the key details we need to understand and follow up on your celebration plan.</p>
      <p lang="ta" className="mt-2 max-w-3xl leading-8 text-stone-700">உங்கள் விழாவை திட்டமிடவும் உங்களை தொடர்பு கொள்ளவும் தேவையான முக்கிய விவரங்களை பகிருங்கள்.</p>

      <div className="mt-8 grid gap-4 rounded-3xl border border-amber-200 bg-white p-5 shadow-lg sm:p-6 md:grid-cols-2 lg:grid-cols-5">
        <ContextItem label="Ceremony" value={selection.ceremony.replace('-marriage', ' Marriage')} actionLabel="Change" onAction={onChangePlan} />
        <ContextItem label="Expected Guests" value={formatPlanGuestCount(selection)} actionLabel="Change" onAction={onChangePlan} />
        <ContextItem label="Plan" value={plan?.name ?? selection.planType} actionLabel="Change" onAction={onChangePlan} />
        <ContextItem label="Session" value={formatPlanDuration(selection.ceremonyDuration)} actionLabel="Change" onAction={onChangePlan} />
        <ContextItem label="Add-ons" value={selection.selectedAddonCodes.length ? `${selection.selectedAddonCodes.length} selected` : 'None selected'} actionLabel="Edit" onAction={onChangePlan} />
      </div>

      <div className="mt-8 space-y-8 rounded-3xl border border-amber-200 bg-white p-5 shadow-xl sm:p-8">
        <section aria-labelledby="plan-v2-event-details">
          <h2 id="plan-v2-event-details" className="text-2xl font-bold text-stone-950">Event Details</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <Field id="preferredDate" label="Preferred Ceremony Date" required error={errors.preferredDate}>
              <Input id="preferredDate" type="date" min={today} value={details.preferredDate ?? ''} onChange={(event) => updateDetails('preferredDate', event.target.value)} aria-invalid={!!errors.preferredDate} aria-describedby={errors.preferredDate ? 'preferredDate-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="alternativeDate" label="Alternative Date" hint="Optional" error={errors.alternativeDate}>
              <Input id="alternativeDate" type="date" min={today} value={details.alternativeDate ?? ''} onChange={(event) => updateDetails('alternativeDate', event.target.value)} aria-invalid={!!errors.alternativeDate} aria-describedby={errors.alternativeDate ? 'alternativeDate-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="travellingFrom" label="Travelling From" required error={errors.travellingFrom}>
              <Input id="travellingFrom" placeholder="Chennai, Bengaluru, Coimbatore, Singapore, etc." value={details.travellingFrom ?? ''} onChange={(event) => updateDetails('travellingFrom', event.target.value)} aria-invalid={!!errors.travellingFrom} aria-describedby={errors.travellingFrom ? 'travellingFrom-error' : undefined} className={fieldClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field id="additionalRequirements" label="Additional Requirements" hint="Optional" error={errors.additionalRequirements}>
                <textarea
                  id="additionalRequirements"
                  rows={4}
                  maxLength={1001}
                  placeholder="Share any additional celebration requirements or family preferences we should know about."
                  value={details.additionalRequirements ?? ''}
                  onChange={(event) => updateDetails('additionalRequirements', event.target.value)}
                  aria-invalid={!!errors.additionalRequirements}
                  aria-describedby={errors.additionalRequirements ? 'additionalRequirements-error' : undefined}
                  className="w-full rounded-md border border-amber-200 bg-white px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
              </Field>
            </div>
          </div>
        </section>

        <section aria-labelledby="plan-v2-couple-details">
          <h2 id="plan-v2-couple-details" className="text-2xl font-bold text-stone-950">Couple Details</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <Field id="husbandName" label="Husband Name" required error={errors.husbandName}>
              <Input id="husbandName" value={details.husbandName ?? ''} onChange={(event) => updateDetails('husbandName', event.target.value)} aria-invalid={!!errors.husbandName} aria-describedby={errors.husbandName ? 'husbandName-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="wifeName" label="Wife Name" required error={errors.wifeName}>
              <Input id="wifeName" value={details.wifeName ?? ''} onChange={(event) => updateDetails('wifeName', event.target.value)} aria-invalid={!!errors.wifeName} aria-describedby={errors.wifeName ? 'wifeName-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="husbandDob" label="Husband Date of Birth" required error={errors.husbandDob}>
              <Input id="husbandDob" type="date" min={minDateOfBirth} max={maxDateOfBirth} value={details.husbandDob ?? ''} onChange={(event) => updateDetails('husbandDob', event.target.value)} aria-invalid={!!errors.husbandDob} aria-describedby={errors.husbandDob ? 'husbandDob-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="wifeDob" label="Wife Date of Birth" required error={errors.wifeDob}>
              <Input id="wifeDob" type="date" min={minDateOfBirth} max={maxDateOfBirth} value={details.wifeDob ?? ''} onChange={(event) => updateDetails('wifeDob', event.target.value)} aria-invalid={!!errors.wifeDob} aria-describedby={errors.wifeDob ? 'wifeDob-error' : undefined} className={fieldClass} />
            </Field>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 p-4">
            <button
              type="button"
              aria-expanded={traditionalOpen}
              aria-controls="plan-v2-traditional-details"
              onClick={() => setTraditionalOpen((open) => !open)}
              className="flex min-h-12 w-full items-center justify-between gap-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            >
              Optional Traditional Details
              <span aria-hidden="true">{traditionalOpen ? '\u2212' : '+'}</span>
            </button>
            <p className="mt-2 leading-7 text-stone-600">Share these details only if they are relevant to your family&apos;s planning.</p>
            <div id="plan-v2-traditional-details" hidden={!traditionalOpen}>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <Field id="husbandNakshatra" label="Husband Nakshatra" hint="Optional" error={errors.husbandNakshatra}>
                  <Input id="husbandNakshatra" value={details.husbandNakshatra ?? ''} onChange={(event) => updateDetails('husbandNakshatra', event.target.value)} aria-invalid={!!errors.husbandNakshatra} aria-describedby={errors.husbandNakshatra ? 'husbandNakshatra-error' : undefined} className={fieldClass} />
                </Field>
                <Field id="husbandRasi" label="Husband Rasi" hint="Optional" error={errors.husbandRasi}>
                  <Input id="husbandRasi" value={details.husbandRasi ?? ''} onChange={(event) => updateDetails('husbandRasi', event.target.value)} aria-invalid={!!errors.husbandRasi} aria-describedby={errors.husbandRasi ? 'husbandRasi-error' : undefined} className={fieldClass} />
                </Field>
                <Field id="wifeNakshatra" label="Wife Nakshatra" hint="Optional" error={errors.wifeNakshatra}>
                  <Input id="wifeNakshatra" value={details.wifeNakshatra ?? ''} onChange={(event) => updateDetails('wifeNakshatra', event.target.value)} aria-invalid={!!errors.wifeNakshatra} aria-describedby={errors.wifeNakshatra ? 'wifeNakshatra-error' : undefined} className={fieldClass} />
                </Field>
                <Field id="wifeRasi" label="Wife Rasi" hint="Optional" error={errors.wifeRasi}>
                  <Input id="wifeRasi" value={details.wifeRasi ?? ''} onChange={(event) => updateDetails('wifeRasi', event.target.value)} aria-invalid={!!errors.wifeRasi} aria-describedby={errors.wifeRasi ? 'wifeRasi-error' : undefined} className={fieldClass} />
                </Field>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="plan-v2-contact-details">
          <h2 id="plan-v2-contact-details" className="text-2xl font-bold text-stone-950">Contact Details</h2>
          <p className="mt-2 leading-7 text-stone-600">Your details are used only to respond to your celebration enquiry.</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <Field id="contactName" label="Your Name" required error={errors.contactName}>
              <Input id="contactName" autoComplete="name" value={details.contactName ?? ''} onChange={(event) => updateDetails('contactName', event.target.value)} aria-invalid={!!errors.contactName} aria-describedby={errors.contactName ? 'contactName-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="mobile" label="Mobile Number" required error={errors.mobile}>
              <Input id="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="Include country code if outside India" value={details.mobile ?? ''} onChange={(event) => updateDetails('mobile', event.target.value)} aria-invalid={!!errors.mobile} aria-describedby={errors.mobile ? 'mobile-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="email" label="Email Address" hint="Required if email is preferred" error={errors.email}>
              <Input id="email" type="email" autoComplete="email" value={details.email ?? ''} onChange={(event) => updateDetails('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className={fieldClass} />
            </Field>
            <Field id="relationship" label="Relationship to Couple" required error={errors.relationship}>
              <select id="relationship" value={details.relationship ?? ''} onChange={(event) => updateDetails('relationship', event.target.value)} aria-invalid={!!errors.relationship} aria-describedby={errors.relationship ? 'relationship-error' : undefined} className={selectClass}>
                <option value="">Select relationship</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Family Member">Family Member</option>
                <option value="Relative">Relative</option>
                <option value="Self">Self</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field id="preferredContactMethod" label="Preferred Contact Method" required error={errors.preferredContactMethod}>
              <select id="preferredContactMethod" value={details.preferredContactMethod ?? ''} onChange={(event) => updateDetails('preferredContactMethod', event.target.value as CelebrationPlanDetailsDraft['preferredContactMethod'])} aria-invalid={!!errors.preferredContactMethod} aria-describedby={errors.preferredContactMethod ? 'preferredContactMethod-error' : undefined} className={selectClass}>
                <option value="">Select contact method</option>
                <option value="phone">Phone</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </Field>
          </div>

          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-stone-700">
            <p>No matrimonial login or profile is required for this enquiry.</p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-stone-800">
              <input
                type="checkbox"
                checked={details.termsPrivacyAcknowledged === true}
                onChange={(event) => updateDetails('termsPrivacyAcknowledged', event.target.checked)}
                aria-invalid={!!errors.termsPrivacyAcknowledged}
                aria-describedby={errors.termsPrivacyAcknowledged ? 'termsPrivacyAcknowledged-error' : undefined}
                className="mt-1 h-5 w-5 shrink-0 accent-amber-700"
              />
              <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-800 underline">Terms &amp; Conditions</a> and acknowledge the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-800 underline">Privacy Policy</a>.</span>
            </label>
            {errors.termsPrivacyAcknowledged && <p id="termsPrivacyAcknowledged-error" role="alert" className="mt-3 font-medium text-red-700">{errors.termsPrivacyAcknowledged}</p>}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack} className="min-h-12 border-amber-700 px-5 font-bold text-amber-800 hover:bg-amber-50">
          Back
        </Button>
        <Button type="button" onClick={validateAndContinue} className="min-h-12 bg-amber-800 px-5 font-bold hover:bg-amber-900">
          Continue to Review
        </Button>
      </div>
    </div>
  )
}

function ContextItem({ label, value, actionLabel, onAction }: { label: string; value: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">{label}</p>
      <p className="mt-2 break-words font-bold text-stone-950">{value}</p>
      <button type="button" onClick={onAction} className="mt-2 min-h-9 text-sm font-bold text-amber-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
        {actionLabel}
      </button>
    </div>
  )
}

function Field({ id, label, hint, required, error, children }: { id: keyof CelebrationPlanDetailsDraft; label: string; hint?: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
        {required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}
        {hint && <span className="ml-1 font-normal text-stone-500">({hint})</span>}
      </Label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  )
}

function focusFirstInvalid(issues: ZodIssue[]) {
  const field = issues[0]?.path[0]
  if (!field || typeof field !== 'string') return
  requestAnimationFrame(() => {
    const element = document.getElementById(field)
    element?.focus()
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}
