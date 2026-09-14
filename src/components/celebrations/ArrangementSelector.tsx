'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  celebrationPlanDefinitions,
  type CelebrationPlanType,
} from '@/lib/celebrations/celebration-plans'
import {
  planV2CeremonyOptions,
  planV2DurationOptions,
  type CelebrationPlanDraftSelection,
  type CelebrationPlanGuestPreset,
  type CelebrationPlanSelection,
} from '@/lib/celebrations/plan-v2'
import { PlanSegmentedSelector } from './PlanSegmentedSelector'

const guestOptions = [
  { value: '50', label: '50 Guests' },
  { value: '100', label: '100 Guests' },
  { value: 'custom', label: 'Custom' },
] as const

export function ArrangementSelector({
  selection,
  onSelectionChange,
  onComplete,
}: {
  selection: CelebrationPlanDraftSelection
  onSelectionChange: (selection: CelebrationPlanDraftSelection) => void
  onComplete: (selection: CelebrationPlanSelection) => void
}) {
  const [message, setMessage] = useState<string>()
  const [guestError, setGuestError] = useState<string>()
  const isCustomGuestCountValid = selection.guestPreset !== 'custom' || Boolean(selection.customGuestCount && selection.customGuestCount > 0 && selection.customGuestCount <= 1000)
  const canSelectPlan = Boolean(selection.ceremony && selection.guestPreset && isCustomGuestCountValid)

  const updateSelection = (next: Partial<CelebrationPlanDraftSelection>) => {
    onSelectionChange({ ...selection, ...next, planType: next.planType === undefined ? selection.planType : next.planType })
    setMessage(undefined)
  }

  const selectPlan = (planType: CelebrationPlanType) => {
    if (!canSelectPlan) {
      setMessage('Please choose ceremony and guest count before selecting a plan.')
      return
    }
    const nextSelection = { ...selection, planType, selectedAddonCodes: selection.selectedAddonCodes ?? [] }
    onSelectionChange(nextSelection)
    onComplete(nextSelection as CelebrationPlanSelection)
  }

  const handleCustomGuestCount = (value: string) => {
    const numeric = Number(value)
    if (!value) {
      setGuestError('Enter the expected guest count.')
      updateSelection({ customGuestCount: undefined, planType: null })
      return
    }
    if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 1000) {
      setGuestError('Enter a guest count between 1 and 1000.')
      updateSelection({ customGuestCount: undefined, planType: null })
      return
    }
    setGuestError(undefined)
    updateSelection({ customGuestCount: numeric, planType: null })
  }

  return (
    <section aria-labelledby="plan-v2-heading" className="py-12 sm:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Plan Celebration</p>
      <h1 id="plan-v2-heading" className="mt-3 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">Choose Your Celebration Arrangement</h1>
      <p lang="ta" className="mt-3 text-2xl font-semibold leading-9 text-amber-900">உங்கள் விழா ஏற்பாட்டைத் தேர்வு செய்யுங்கள்</p>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">Select your ceremony, expected guest count and celebration plan. Guest count helps planning and does not change plan inclusions.</p>
      <p lang="ta" className="mt-2 max-w-3xl leading-8 text-stone-700">உங்கள் விழா, விருந்தினர் எண்ணிக்கை மற்றும் தேவையான ஏற்பாட்டு முறையைத் தேர்வு செய்யுங்கள்.</p>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <PlanSegmentedSelector
          legend="Ceremony"
          name="plan-v2-ceremony"
          value={selection.ceremony}
          options={planV2CeremonyOptions}
          onChange={(ceremony) => updateSelection({ ceremony, planType: null })}
        />
        <PlanSegmentedSelector
          legend="Guest Count"
          name="plan-v2-guest-count"
          value={selection.guestPreset}
          options={guestOptions}
          onChange={(guestPreset: CelebrationPlanGuestPreset) => {
            setGuestError(undefined)
            updateSelection({ guestPreset, customGuestCount: guestPreset === 'custom' ? selection.customGuestCount : undefined, planType: null })
          }}
        >
          {selection.guestPreset === 'custom' && (
            <div className="mt-4">
              <label htmlFor="plan-v2-custom-guests" className="text-sm font-semibold text-stone-700">Expected Guests</label>
              <Input
                id="plan-v2-custom-guests"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                step={1}
                value={selection.customGuestCount ?? ''}
                onChange={(event) => handleCustomGuestCount(event.target.value)}
                aria-invalid={!!guestError}
                aria-describedby={guestError ? 'plan-v2-custom-guests-error' : undefined}
                className="mt-2 h-12 border-amber-200 text-base focus-visible:ring-amber-700"
              />
              {guestError && <p id="plan-v2-custom-guests-error" role="alert" className="mt-2 text-sm font-medium text-red-700">{guestError}</p>}
            </div>
          )}
        </PlanSegmentedSelector>
        <PlanSegmentedSelector
          legend="Session"
          name="plan-v2-session"
          value={selection.ceremonyDuration}
          options={planV2DurationOptions}
          onChange={(ceremonyDuration) => updateSelection({ ceremonyDuration })}
        />
      </div>

      <fieldset className="mt-10">
        <legend className="text-2xl font-bold text-stone-950">Plan</legend>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {celebrationPlanDefinitions.map((plan) => (
            <article key={plan.type} className={`flex min-h-full flex-col rounded-3xl border bg-white p-5 shadow-lg sm:p-6 ${plan.type === 'premium' ? 'border-amber-500 ring-1 ring-amber-200' : 'border-amber-200'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-bold text-stone-950">{plan.name}</h2>
                  <p lang="ta" className="mt-1 font-semibold text-amber-900">{plan.tamilName}</p>
                  <p className="mt-2 font-bold text-amber-800">{plan.subtitle}</p>
                </div>
                {selection.planType === plan.type && <CheckCircle2 aria-label="Selected" className="h-7 w-7 text-amber-800" />}
              </div>
              <p className="mt-4 leading-7 text-stone-600">{plan.shortDescription}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {plan.preview.map((item) => (
                  <li key={item} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-sm font-bold text-stone-800">{item}</li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={() => selectPlan(plan.type)}
                className="mt-7 min-h-12 w-full bg-amber-800 text-base hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                aria-pressed={selection.planType === plan.type}
              >
                Select {plan.type === 'basic' ? 'Basic' : 'Premium'}
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Button>
            </article>
          ))}
        </div>
      </fieldset>

      {message && <p role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">{message}</p>}

      <div className="mt-8 rounded-3xl border border-amber-200 bg-white p-5 text-stone-700 sm:p-6">
        <p className="leading-7">Final arrangements, availability and pricing are confirmed after our team reviews your enquiry. MyThirumanam is an independent event-management and coordination service.</p>
      </div>
    </section>
  )
}
