'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormContext, useWatch, type FieldErrors } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getCelebrationServiceIcon } from './CelebrationServices'
import { getCelebrationServicePresentation, type PublicCelebrationService } from '@/lib/celebrations/service-query'
import type { CeremonySlug } from '@/lib/celebrations'
import { submitCelebrationEnquiry } from '@/lib/celebrations/client-submission'
import { groupCelebrationServices } from '@/lib/celebrations/service-presentation'
import { getAlternativeDateConflictMessage, getCelebrationDateBounds } from '@/lib/celebrations/date'
import { sanitizeIndianMobileInput, sanitizeLocationInput, sanitizePersonNameInput } from '@/lib/celebrations/enquiry-validation'
import { ceremonySelectionOptions } from '@/lib/celebrations'
import { EnquiryReview, EnquiryConfirmation } from './EnquirySummary'
import { TurnstileChallenge } from './TurnstileChallenge'
import { IndependentServiceNotice } from './IndependentServiceNotice'
import {
  celebrationTypes,
  celebrationEnquiryApiSchema,
  type CelebrationEnquiryApiInput,
  type CelebrationEnquiryFormValues,
} from '@/lib/validations/celebration-enquiry-api.schema'

const steps = ['Ceremony', 'Couple', 'Event', 'Services', 'Contact', 'Review'] as const
const stepFields: Array<Array<keyof CelebrationEnquiryFormValues>> = [
  ['celebrationType'],
  ['husbandName', 'wifeName', 'husbandDob', 'wifeDob', 'husbandNakshatra', 'wifeNakshatra', 'husbandRasi', 'wifeRasi'],
  ['preferredDate', 'alternativeDate', 'guestCountRange', 'travellingFrom', 'arrangementPreference'],
  ['serviceIds', 'otherServiceDetails'],
  ['contactName', 'mobile', 'email', 'relationship', 'preferredContactMethod', 'notes'],
]
const fieldClass = 'h-12 border-amber-200 text-base focus-visible:ring-amber-700'
const selectClass = 'h-12 w-full rounded-md border border-amber-200 bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-700'

export function CelebrationEnquiryForm({
  services,
  initialCeremony,
  servicesAvailable = true,
}: {
  services: PublicCelebrationService[]
  initialCeremony?: CeremonySlug
  servicesAvailable?: boolean
}) {
  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)
  const [astrologyOpen, setAstrologyOpen] = useState(false)
  const [legalAcknowledged, setLegalAcknowledged] = useState(false)
  const [legalAcknowledgementError, setLegalAcknowledgementError] = useState<string>()
  const legalAcknowledgementRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const navigationRef = useRef(false)
  const [submitMessage, setSubmitMessage] = useState<string>()
  const [enquiryReference, setEnquiryReference] = useState<string>()
  const [botToken, setBotToken] = useState<string>()
  const [challengeVersion, setChallengeVersion] = useState(0)
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const challengeRequired = process.env.NODE_ENV === 'production' || Boolean(turnstileSiteKey)
  const handleBotToken = useCallback((token?: string) => setBotToken(token), [])
  const { today, minDateOfBirth, maxDateOfBirth } = getCelebrationDateBounds()

  const methods = useForm<CelebrationEnquiryFormValues, unknown, CelebrationEnquiryApiInput>({
    resolver: zodResolver(celebrationEnquiryApiSchema),
    mode: 'onTouched',
    shouldFocusError: false,
    defaultValues: { celebrationType: initialCeremony, serviceIds: [], email: '', relationship: '', otherServiceDetails: '', notes: '' },
  })
  const {
    register,
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    getValues,
    setValue,
    getFieldState,
    control,
    formState: { errors, isSubmitting },
  } = methods
  const arrangement = useWatch({ control, name: 'arrangementPreference' })
  const selectedIds = useWatch({ control, name: 'serviceIds' })
  const values = useWatch({ control }) as CelebrationEnquiryFormValues
  const ceremony = ceremonySelectionOptions.find((item) => item.value === values.celebrationType)
  const groupedServices = groupCelebrationServices(services)

  const navigate = (nextStep: number) => {
    if (step === 5 && nextStep !== 5) setBotToken(undefined)
    navigationRef.current = true
    setStep(nextStep)
  }

  useEffect(() => {
    if (!navigationRef.current) return
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById('celebration-form-heading')
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [step])

  const exposeErrors = (validationErrors: FieldErrors<CelebrationEnquiryFormValues>) => {
    const invalidStep = stepFields.findIndex((fields) => fields.some((field) => validationErrors[field]))
    if (invalidStep < 0) return
    if (['husbandNakshatra', 'wifeNakshatra', 'husbandRasi', 'wifeRasi'].some((field) => validationErrors[field as keyof CelebrationEnquiryFormValues])) {
      setAstrologyOpen(true)
    }
    setEditing(true)
    setSubmitMessage('Please check the highlighted details before reviewing your request.')
    navigate(invalidStep)
  }

  useEffect(() => {
    if (!enquiryReference) return
    const frame = requestAnimationFrame(() => {
      const heading = document.getElementById('enquiry-success-title')
      heading?.scrollIntoView({ block: 'start', behavior: 'instant' })
      heading?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [enquiryReference])

  const goNext = async () => {
    setSubmitMessage(undefined)

    if (step === 4 && !legalAcknowledged) {
      setLegalAcknowledgementError('Please agree to the Terms & Conditions and acknowledge the Privacy Policy before continuing.')
      legalAcknowledgementRef.current?.focus()
      return
    }

    if (step === 0) {
      if (!celebrationTypes.includes(getValues('celebrationType') as (typeof celebrationTypes)[number])) {
        setError('celebrationType', { type: 'manual', message: 'Please select the ceremony.' }, { shouldFocus: true })
        return
      }
      clearErrors('celebrationType')
    } else if (!(await trigger(stepFields[step], { shouldFocus: true }))) {
      if (
        step === 1 &&
        ['husbandNakshatra', 'wifeNakshatra', 'husbandRasi', 'wifeRasi'].some((field) => getFieldState(field as keyof CelebrationEnquiryFormValues).invalid)
      ) {
        setAstrologyOpen(true)
        setSubmitMessage('Please check the highlighted astrology details, or leave them blank.')
      }
      return
    }

    if (step === 3 && getValues('arrangementPreference') !== 'need-guidance' && getValues('serviceIds').length === 0) {
      setError('serviceIds', { type: 'manual', message: 'Please select at least one service, or choose Need Guidance.' }, { shouldFocus: true })
      return
    }
    if (step === 2) {
      const alternativeDateConflict = getAlternativeDateConflictMessage(getValues('preferredDate') ?? '', getValues('alternativeDate') ?? '', today)
      if (alternativeDateConflict) {
        setError('alternativeDate', { type: 'manual', message: alternativeDateConflict }, { shouldFocus: true })
        return
      }
    }
    if (step === 3) clearErrors('serviceIds')
    if (step === 4 || editing) {
      const validation = celebrationEnquiryApiSchema.safeParse(getValues())
      if (!validation.success) {
        const validationErrors: FieldErrors<CelebrationEnquiryFormValues> = {}
        for (const issue of validation.error.issues) {
          const name = issue.path[0] as keyof CelebrationEnquiryFormValues
          setError(name, { type: 'manual', message: issue.message })
          validationErrors[name] = { type: 'manual', message: issue.message }
        }
        exposeErrors(validationErrors)
        return
      }
      setEditing(false)
      navigate(5)
    } else {
      navigate(Math.min(step + 1, steps.length - 1))
    }
  }

  const goBack = () => {
    setSubmitMessage(undefined)
    setEditing(false)
    navigate(Math.max(step - 1, 0))
  }

  const submit = async (submittedValues: CelebrationEnquiryApiInput) => {
    if (step !== 5 || submittingRef.current || (challengeRequired && !botToken)) return
    submittingRef.current = true
    setSubmitMessage(undefined)
    const result = await submitCelebrationEnquiry(submittedValues, botToken)
    submittingRef.current = false
    if (result.ok || result.kind !== 'rate-limited') {
      setBotToken(undefined)
      setChallengeVersion((current) => current + 1)
    }
    if (!result.ok) {
      if (result.kind === 'validation') {
        for (const [name, messages] of Object.entries(result.errors)) {
          if (messages?.[0] && name in submittedValues) setError(name as keyof CelebrationEnquiryFormValues, { type: 'server', message: messages[0] })
        }
        setSubmitMessage('Please check the highlighted details and try again.')
      } else if (result.kind === 'too-large') {
        setSubmitMessage('Your request contains too much information. Please shorten the notes or additional details and try again.')
      } else if (result.kind === 'rate-limited') {
        setSubmitMessage('Too many requests. Please wait a little while and try again.')
      } else if (result.kind === 'challenge') {
        setSubmitMessage("We couldn't verify the submission. Please complete the verification and try again.")
      } else if (result.kind === 'verification-unavailable') {
        setSubmitMessage('Verification is temporarily unavailable. Please try again shortly.')
      } else if (result.kind === 'network') {
        setSubmitMessage("We couldn't submit your request right now. Please check your connection and try again.")
      } else {
        setSubmitMessage("We couldn't submit your request right now. Please try again.")
      }
      return
    }
    setEnquiryReference(result.enquiryReference)
  }

  if (enquiryReference) return <EnquiryConfirmation enquiryReference={enquiryReference} values={getValues()} ceremony={ceremony} />

  const describedBy = (name: keyof CelebrationEnquiryFormValues) => (errors[name] ? `${name}-error` : undefined)

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        onSubmit={(event) => {
          if (step !== 5) {
            event.preventDefault()
            void goNext()
          } else {
            void handleSubmit(submit, exposeErrors)(event)
          }
        }}
        className="rounded-3xl border border-amber-200 bg-white shadow-xl"
      >
        <div className="border-b border-amber-100 p-5 sm:p-8">
          <div className="flex items-center justify-between gap-4 text-sm font-semibold">
            <span>Step {step + 1} of {steps.length}</span>
            <span className="text-amber-800">{steps[step]}</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100"
            role="progressbar"
            aria-label="Form progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step + 1}
          >
            <div className="h-full rounded-full bg-amber-700" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <ol className="mt-5 hidden grid-cols-6 gap-2 text-center text-sm sm:grid">
            {steps.map((label, index) => (
              <li key={label} aria-current={index === step ? 'step' : undefined} className={index <= step ? 'font-bold text-amber-800' : 'text-stone-400'}>
                <span className="block">{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-[32rem] p-5 pb-10 sm:p-8 sm:pb-12">
          <h2 id="celebration-form-heading" tabIndex={-1} className="mb-4 scroll-mt-28 text-sm font-semibold uppercase tracking-wide text-amber-800 focus:outline-none">
            {steps[step]} details
          </h2>

          {step === 0 && (
            <fieldset>
              <legend className="text-2xl font-bold">Choose the ceremony</legend>
              <p className="mt-2 text-base leading-7 text-stone-600">
                Start with the ceremony you are planning, or choose guidance if you are unsure. No account is needed. You can review everything before sending.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {ceremonySelectionOptions.map((item) => (
                  <label key={item.value} className="flex min-h-24 cursor-pointer items-start gap-4 rounded-2xl border border-amber-200 p-5 has-[:checked]:border-amber-700 has-[:checked]:bg-amber-50">
                    <input
                      type="radio"
                      value={item.value}
                      {...register('celebrationType')}
                      onChange={() => setValue('celebrationType', item.value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                      aria-describedby={describedBy('celebrationType')}
                      className="mt-1 h-5 w-5 shrink-0 accent-amber-700"
                    />
                    <span>
                      <span className="block font-bold">{item.title}</span>
                      <span lang="ta" className="mt-1 block leading-6 text-stone-600">{item.tamil}</span>
                    </span>
                  </label>
                ))}
              </div>
              <ErrorText name="celebrationType" />
            </fieldset>
          )}

          {step === 1 && (
            <section aria-labelledby="couple-heading">
              <h3 id="couple-heading" className="text-2xl font-bold">Couple details</h3>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <Field id="husbandName" label="Husband Name" hint="Optional" error={<ErrorText name="husbandName" />}>
                  <Input id="husbandName" maxLength={50} autoComplete="name" {...register('husbandName')} onChange={(event) => setValue('husbandName', sanitizePersonNameInput(event.target.value), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} aria-invalid={!!errors.husbandName} aria-describedby={describedBy('husbandName')} className={fieldClass} />
                </Field>
                <Field id="wifeName" label="Wife Name" hint="Optional" error={<ErrorText name="wifeName" />}>
                  <Input id="wifeName" maxLength={50} autoComplete="name" {...register('wifeName')} onChange={(event) => setValue('wifeName', sanitizePersonNameInput(event.target.value), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} aria-invalid={!!errors.wifeName} aria-describedby={describedBy('wifeName')} className={fieldClass} />
                </Field>
                <Field id="husbandDob" label="Husband Date of Birth" hint="Optional" error={<ErrorText name="husbandDob" />}>
                  <Input id="husbandDob" type="date" min={minDateOfBirth} max={maxDateOfBirth} {...register('husbandDob')} aria-invalid={!!errors.husbandDob} aria-describedby={describedBy('husbandDob')} className={fieldClass} />
                </Field>
                <Field id="wifeDob" label="Wife Date of Birth" hint="Optional" error={<ErrorText name="wifeDob" />}>
                  <Input id="wifeDob" type="date" min={minDateOfBirth} max={maxDateOfBirth} {...register('wifeDob')} aria-invalid={!!errors.wifeDob} aria-describedby={describedBy('wifeDob')} className={fieldClass} />
                </Field>
              </div>

              <div className="mt-7 rounded-2xl border border-amber-200 p-4">
                <button
                  type="button"
                  aria-expanded={astrologyOpen}
                  aria-controls="astrology-details"
                  onClick={() => setAstrologyOpen((open) => !open)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 text-left font-semibold focus-visible:outline-2 focus-visible:outline-amber-800"
                >
                  Astrology details (optional)
                  <span aria-hidden="true">{astrologyOpen ? '\u2212' : '+'}</span>
                </button>
                <p className="mt-2 leading-7 text-stone-600">
                  Add these details if available. You can still send your planning request without them.
                </p>
                <div id="astrology-details" hidden={!astrologyOpen}>
                  <div className="mt-5 grid gap-6 sm:grid-cols-2">
                    <Field id="husbandNakshatra" label="Husband Nakshatra" hint="Optional" error={<ErrorText name="husbandNakshatra" />}>
                      <Input id="husbandNakshatra" {...register('husbandNakshatra')} aria-invalid={!!errors.husbandNakshatra} aria-describedby={describedBy('husbandNakshatra')} className={fieldClass} />
                    </Field>
                    <Field id="wifeNakshatra" label="Wife Nakshatra" hint="Optional" error={<ErrorText name="wifeNakshatra" />}>
                      <Input id="wifeNakshatra" {...register('wifeNakshatra')} aria-invalid={!!errors.wifeNakshatra} aria-describedby={describedBy('wifeNakshatra')} className={fieldClass} />
                    </Field>
                    <Field id="husbandRasi" label="Husband Rasi" hint="Optional" error={<ErrorText name="husbandRasi" />}>
                      <Input id="husbandRasi" {...register('husbandRasi')} aria-invalid={!!errors.husbandRasi} aria-describedby={describedBy('husbandRasi')} className={fieldClass} />
                    </Field>
                    <Field id="wifeRasi" label="Wife Rasi" hint="Optional" error={<ErrorText name="wifeRasi" />}>
                      <Input id="wifeRasi" {...register('wifeRasi')} aria-invalid={!!errors.wifeRasi} aria-describedby={describedBy('wifeRasi')} className={fieldClass} />
                    </Field>
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="event-heading">
              <h3 id="event-heading" className="text-2xl font-bold">Ceremony details</h3>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <Field id="preferredDate" label="Preferred Ceremony Date" required error={<ErrorText name="preferredDate" />}>
                  <Input id="preferredDate" type="date" min={today} {...register('preferredDate')} aria-invalid={!!errors.preferredDate} aria-describedby={describedBy('preferredDate')} className={fieldClass} />
                </Field>
                <Field id="alternativeDate" label="Alternative Date" hint="Optional" error={<ErrorText name="alternativeDate" />}>
                  <Input id="alternativeDate" type="date" min={today} {...register('alternativeDate')} aria-invalid={!!errors.alternativeDate} aria-describedby={describedBy('alternativeDate')} className={fieldClass} />
                </Field>
                <Field id="guestCountRange" label="Number of Guests" required error={<ErrorText name="guestCountRange" />}>
                  <select id="guestCountRange" {...register('guestCountRange')} aria-invalid={!!errors.guestCountRange} aria-describedby={describedBy('guestCountRange')} className={selectClass}>
                    <option value="">Select guest count</option>
                    <option value="below-20">Below 20</option>
                    <option value="20-50">20–50</option>
                    <option value="51-100">51–100</option>
                    <option value="100-plus">100+</option>
                  </select>
                </Field>
                <Field id="travellingFrom" label="Travelling From" required error={<ErrorText name="travellingFrom" />}>
                  <Input id="travellingFrom" maxLength={50} placeholder="Chennai, Bengaluru, Coimbatore, Singapore, etc." {...register('travellingFrom')} onChange={(event) => setValue('travellingFrom', sanitizeLocationInput(event.target.value), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} aria-invalid={!!errors.travellingFrom} aria-describedby={describedBy('travellingFrom')} className={fieldClass} />
                </Field>
                <Field id="arrangementPreference" label="Arrangement Preference" required error={<ErrorText name="arrangementPreference" />}>
                  <select id="arrangementPreference" {...register('arrangementPreference')} aria-invalid={!!errors.arrangementPreference} aria-describedby={describedBy('arrangementPreference')} className={selectClass}>
                    <option value="">Select preference</option>
                    <option value="ceremony-only">Ceremony Only</option>
                    <option value="ceremony-food">Ceremony + Food</option>
                    <option value="ceremony-stay">Ceremony + Stay</option>
                    <option value="complete-arrangement">Complete Arrangement</option>
                    <option value="need-guidance">Need Guidance</option>
                  </select>
                </Field>
              </div>
            </section>
          )}

          {step === 3 && (
            <fieldset>
              <legend className="text-2xl font-bold">Services required</legend>
              <p className="mt-2 leading-7 text-stone-600">Select the services you would like to request. Availability is confirmed separately.</p>
              <div className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-stone-700"><IndependentServiceNotice variant="planning" /><IndependentServiceNotice locale="ta" variant="planning" /></div>
              {!servicesAvailable && (
                <p role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-stone-700">
                  Services could not be loaded right now. You may continue only by choosing <strong>Need Guidance</strong>, or return later to select services.
                </p>
              )}
              <p role="status" aria-live="polite" aria-atomic="true" className="mt-4 font-semibold text-amber-800">
                {selectedIds.length} {selectedIds.length === 1 ? 'service' : 'services'} selected
              </p>
              {groupedServices.map((group) => (
                <fieldset key={group.name} className="mt-7">
                  <legend className="text-lg font-bold">{group.name}</legend>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {group.services.map((service) => {
                      const Icon = getCelebrationServiceIcon(service.icon)
                      const presentation = getCelebrationServicePresentation(service)
                      return (
                        <label key={service.id} className="relative flex min-h-24 cursor-pointer items-start gap-4 rounded-2xl border border-amber-200 p-5 has-[:checked]:border-amber-700 has-[:checked]:bg-amber-50">
                          <input type="checkbox" value={service.id} {...register('serviceIds')} aria-describedby={describedBy('serviceIds')} className="peer mt-1 h-5 w-5 shrink-0 accent-amber-700" />
                          <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-amber-800" />
                          <span className="min-w-0">
                            <span className="block break-words font-bold">{presentation.name}</span>
                            {presentation.description && <span className="mt-1 block break-words text-sm leading-6 text-stone-600">{presentation.description}</span>}
                          </span>
                          <Check aria-hidden="true" className="absolute right-3 top-3 hidden h-5 w-5 text-amber-800 peer-checked:block" />
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
              {services.length === 0 && servicesAvailable && (
                <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4">No services are currently listed. Select Need Guidance to continue without choosing a service.</p>
              )}
              <ErrorText name="serviceIds" />
              <div className="mt-8">
                <Field id="otherServiceDetails" label="Additional service requirement" hint="Optional" error={<ErrorText name="otherServiceDetails" />}>
                  <Textarea id="otherServiceDetails" rows={4} placeholder="Please tell us what else you need." {...register('otherServiceDetails')} aria-invalid={!!errors.otherServiceDetails} aria-describedby={describedBy('otherServiceDetails')} className="text-base border-amber-200 focus-visible:ring-amber-700" />
                </Field>
              </div>
              {arrangement === 'need-guidance' && <p className="mt-4 text-sm font-medium text-amber-800">You may continue without selecting a service because you requested guidance.</p>}
            </fieldset>
          )}

          {step === 4 && (
            <section aria-labelledby="contact-heading">
              <h3 id="contact-heading" className="text-2xl font-bold">Contact details</h3>
              <p className="mt-2 leading-7 text-stone-600">Your details are used only to respond to your celebration enquiry.</p>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <Field id="contactName" label="Contact Person Name" required error={<ErrorText name="contactName" />}>
                  <Input id="contactName" maxLength={50} autoComplete="name" {...register('contactName')} onChange={(event) => setValue('contactName', sanitizePersonNameInput(event.target.value), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} aria-invalid={!!errors.contactName} aria-describedby={describedBy('contactName')} className={fieldClass} />
                </Field>
                <Field id="mobile" label="Mobile Number" required error={<ErrorText name="mobile" />}>
                  <Input id="mobile" maxLength={15} type="tel" inputMode="tel" autoComplete="tel" placeholder="9876543210 or +91 98765 43210" {...register('mobile')} onChange={(event) => setValue('mobile', sanitizeIndianMobileInput(event.target.value), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} aria-invalid={!!errors.mobile} aria-describedby={describedBy('mobile')} className={fieldClass} />
                </Field>
                <Field id="email" label="Email" hint="Required if email is preferred" error={<ErrorText name="email" />}>
                  <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby={describedBy('email')} className={fieldClass} />
                </Field>
                <Field id="relationship" label="Relationship to Couple" required error={<ErrorText name="relationship" />}>
                  <select id="relationship" {...register('relationship')} aria-invalid={!!errors.relationship} aria-describedby={describedBy('relationship')} className={selectClass}>
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
                <Field id="preferredContactMethod" label="Preferred Contact Method" required error={<ErrorText name="preferredContactMethod" />}>
                  <select id="preferredContactMethod" {...register('preferredContactMethod')} aria-invalid={!!errors.preferredContactMethod} aria-describedby={describedBy('preferredContactMethod')} className={selectClass}>
                    <option value="">Select contact method</option>
                    <option value="phone">Phone</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field id="notes" label="Additional Notes" hint="Optional" error={<ErrorText name="notes" />}>
                    <Textarea id="notes" rows={5} placeholder="Share traditions, accessibility needs, guest details or other information." {...register('notes')} aria-invalid={!!errors.notes} aria-describedby={describedBy('notes')} className="text-base border-amber-200 focus-visible:ring-amber-700" />
                  </Field>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-stone-700">
                <p className="flex items-start gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
                No matrimonial login or profile is required for this enquiry.
                </p>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-stone-800">
                  <input ref={legalAcknowledgementRef} type="checkbox" checked={legalAcknowledged} onChange={(event) => { setLegalAcknowledged(event.target.checked); if (event.target.checked) setLegalAcknowledgementError(undefined) }} aria-invalid={!!legalAcknowledgementError} aria-describedby={legalAcknowledgementError ? 'legal-acknowledgement-error' : undefined} className="mt-1 h-5 w-5 shrink-0 accent-amber-700" />
                  <span>I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-800 underline">Terms &amp; Conditions</a> and acknowledge the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-800 underline">Privacy Policy</a>.</span>
                </label>
                {legalAcknowledgementError && <p id="legal-acknowledgement-error" role="alert" className="mt-3 font-medium text-red-700">{legalAcknowledgementError}</p>}
              </div>
            </section>
          )}

          {step === 5 && (
            <EnquiryReview
              disabled={isSubmitting}
              values={values}
              services={services}
              ceremony={ceremony}
              onEdit={(target) => {
                if (isSubmitting) return
                setEditing(true)
                setSubmitMessage(undefined)
                navigate(target)
              }}
            />
          )}

          {step === 5 && (
            turnstileSiteKey ? (
              <TurnstileChallenge key={challengeVersion} siteKey={turnstileSiteKey} onTokenChange={handleBotToken} />
            ) : challengeRequired ? (
              <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">Verification is temporarily unavailable.</p>
            ) : null
          )}

          {step === 5 && Object.entries(errors).some(([, error]) => error?.type === 'server') && (
            <div className="mt-5 rounded-xl border border-red-200 p-4">
              <p className="font-semibold">Details to check</p>
              <ul className="mt-2 space-y-2">
                {Object.entries(errors)
                  .filter(([, error]) => error?.type === 'server')
                  .map(([field, error]) => {
                    const target = stepFields.findIndex((fields) => fields.includes(field as keyof CelebrationEnquiryFormValues))
                    return (
                      <li key={field}>
                        <p>{String(error?.message)}</p>
                        {target >= 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isSubmitting}
                            className="mt-2 min-h-12"
                            onClick={() => {
                              if (target === 1) setAstrologyOpen(true)
                              setEditing(true)
                              navigate(target)
                            }}
                          >
                            Correct {steps[target]} details
                          </Button>
                        )}
                      </li>
                    )
                  })}
              </ul>
            </div>
          )}

          {submitMessage && (
            <div role="alert" aria-live="assertive" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-800">
              {submitMessage}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-b-3xl border-t border-amber-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.04)] sm:px-8">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || isSubmitting} className="min-h-12 px-4">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button
              key="next"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                void goNext()
              }}
              disabled={isSubmitting}
              className="min-h-12 bg-amber-700 px-5 hover:bg-amber-800"
            >
              {editing ? 'Return to Review' : step === 4 ? 'Review request' : 'Continue'}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              key="submit"
              type="submit"
              disabled={isSubmitting || (challengeRequired && !botToken)}
              aria-busy={isSubmitting}
              className="min-h-12 whitespace-normal bg-amber-700 px-3 text-sm hover:bg-amber-800 sm:px-5"
            >
              {isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Submitting…' : 'Submit Planning Request'}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

function ErrorText({ name }: { name: keyof CelebrationEnquiryFormValues }) {
  const {
    formState: { errors },
  } = useFormContext<CelebrationEnquiryFormValues>()
  return errors[name]?.message ? <p id={`${name}-error`} role="alert" className="mt-2 text-sm font-medium text-red-700">{String(errors[name]?.message)}</p> : null
}

function Field({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  error?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
        {required && <span className="ml-1 text-red-700" aria-hidden="true">*</span>}
        {hint && <span className="ml-1 font-normal text-stone-500">({hint})</span>}
      </Label>
      {children}
      {error}
    </div>
  )
}
