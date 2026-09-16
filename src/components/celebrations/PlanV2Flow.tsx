'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { CeremonySlug } from '@/lib/celebrations'
import type { PublicCelebrationService } from '@/lib/celebrations/service-query'
import {
  getPlanStepStatuses,
  planV2Steps,
  type CelebrationPlanDraftSelection,
  type CelebrationPlanSelection,
  type CelebrationPlanView,
} from '@/lib/celebrations/plan-v2'
import { ArrangementSelector } from './ArrangementSelector'
import { PlanDetailsScreen } from './PlanDetailsScreen'
import { PlanConfirmationScreen } from './PlanConfirmationScreen'
import { PlanReviewScreen } from './PlanReviewScreen'

export function PlanV2Flow({
  services,
  initialCeremony,
}: {
  services: PublicCelebrationService[]
  initialCeremony?: CeremonySlug
}) {
  const [view, setView] = useState<CelebrationPlanView>('arrangement')
  const [submittedEnquiryReference, setSubmittedEnquiryReference] = useState<string>()
  const hasMounted = useRef(false)
  const [selection, setSelection] = useState<CelebrationPlanDraftSelection>({
    ceremony: initialCeremony ?? '60th-marriage',
    guestPreset: '50',
    ceremonyDuration: 'one_session',
    planType: null,
    selectedAddonCodes: [],
  })

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  const confirmSelection = (completeSelection: CelebrationPlanSelection) => {
    setSelection((current) => {
      const planChanged = current.planType !== completeSelection.planType
      return {
        ...completeSelection,
        selectedAddonCodes: planChanged ? [] : current.selectedAddonCodes ?? [],
        details: planChanged ? undefined : current.details,
      }
    })
    setView('plan')
  }

  const startAnotherEnquiry = () => {
    setSubmittedEnquiryReference(undefined)
    setView('arrangement')
    setSelection({ ceremony: initialCeremony ?? '60th-marriage', guestPreset: '50', ceremonyDuration: 'one_session', planType: null, selectedAddonCodes: [] })
  }

  if (submittedEnquiryReference) {
    return <PlanV2Success enquiryReference={submittedEnquiryReference} onStartAnother={startAnotherEnquiry} />
  }

  if (view === 'arrangement') {
    return <ArrangementSelector selection={selection} onSelectionChange={setSelection} onComplete={confirmSelection} />
  }

  return (
    <section className="py-12 sm:py-16">
      <PlanV2Progress view={view} />
      {view === 'plan' && selection.planType && selection.ceremony && selection.guestPreset && (
        <PlanConfirmationScreen
          services={services}
          selection={selection as CelebrationPlanSelection}
          onSelectionChange={setSelection}
          onChangeSelection={() => setView('arrangement')}
          onContinue={() => setView('details')}
        />
      )}
      {view === 'details' && (
        selection.planType && selection.ceremony && selection.guestPreset && (
          <PlanDetailsScreen
            selection={selection as CelebrationPlanSelection}
            onSelectionChange={setSelection}
            onBack={() => setView('plan')}
            onContinue={() => setView('review')}
            onChangePlan={() => setView('plan')}
          />
        )
      )}
      {view === 'review' && (
        selection.planType && selection.ceremony && selection.guestPreset && (
          <PlanReviewScreen
            services={services}
            selection={selection as CelebrationPlanSelection}
            onBack={() => setView('details')}
            onEditPlan={() => setView('plan')}
            onEditDetails={() => setView('details')}
            onSuccess={(_, enquiryReference) => setSubmittedEnquiryReference(enquiryReference)}
          />
        )
      )}
    </section>
  )
}

function PlanV2Success({ enquiryReference, onStartAnother }: { enquiryReference: string; onStartAnother: () => void }) {
  return (
    <section className="py-12 sm:py-16">
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Enquiry received</p>
        <h1 id="plan-v2-success-title" tabIndex={-1} className="mt-3 text-4xl font-bold leading-tight text-stone-950 sm:text-5xl">Enquiry Sent Successfully</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">Thank you. We have received your celebration planning request.</p>
        <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-800">Enquiry Reference</p>
          <p className="mt-2 break-all text-2xl font-bold text-stone-950">{enquiryReference}</p>
        </div>
        <p className="mt-5 leading-7 text-stone-700">Your enquiry has been received. Final arrangements are confirmed separately after review.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-800 px-5 font-bold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
            Back to Home
          </Link>
          <Link href="/celebrations" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-700 px-5 font-bold text-amber-800 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
            View Celebration Guides
          </Link>
          <button type="button" onClick={onStartAnother} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-amber-700 px-5 font-bold text-amber-800 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
            Start Another Enquiry
          </button>
        </div>
      </div>
    </section>
  )
}

function PlanV2Progress({ view }: { view: CelebrationPlanView }) {
  const statuses = getPlanStepStatuses(view)
  return (
    <nav aria-label="Celebration planning progress" className="overflow-x-auto pb-2">
      <ol className="grid min-w-[26rem] grid-cols-3 gap-3 sm:min-w-0">
        {planV2Steps.map((step, index) => {
          const status = statuses[step.id]
          return (
            <li key={step.id} aria-current={status === 'active' ? 'step' : undefined} className={`rounded-2xl border p-3 text-sm ${status === 'active' ? 'border-amber-700 bg-amber-800 text-white' : status === 'completed' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-amber-200 bg-white text-stone-500'}`}>
              <span className="block font-bold">{index + 1} {step.label}</span>
              <span className="mt-1 block text-xs capitalize opacity-80">{status}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
