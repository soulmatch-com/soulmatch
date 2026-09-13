'use client'

import { Check, PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCeremony } from '@/lib/celebrations'
import {
  celebrationAddonCodes,
  getCelebrationPlanDefinition,
  isCelebrationAddonCode,
  type CelebrationAddonCode,
} from '@/lib/celebrations/celebration-plans'
import { getCelebrationServicePresentation, type PublicCelebrationService } from '@/lib/celebrations/service-query'
import {
  formatPlanGuestCount,
  formatPlanDuration,
  type CelebrationPlanSelection,
} from '@/lib/celebrations/plan-v2'
import { IndependentServiceNotice } from './IndependentServiceNotice'

export function PlanConfirmationScreen({
  services,
  selection,
  onSelectionChange,
  onChangeSelection,
  onContinue,
}: {
  services: PublicCelebrationService[]
  selection: CelebrationPlanSelection
  onSelectionChange: (selection: CelebrationPlanSelection) => void
  onChangeSelection: () => void
  onContinue: () => void
}) {
  const ceremony = getCeremony(selection.ceremony)
  const plan = getCelebrationPlanDefinition(selection.planType)
  const addonServices = celebrationAddonCodes
    .map((code) => services.find((service) => service.code === code))
    .filter((service): service is PublicCelebrationService => Boolean(service))

  const toggleAddon = (code: CelebrationAddonCode) => {
    onSelectionChange({
      ...selection,
      selectedAddonCodes: selection.selectedAddonCodes.includes(code)
        ? selection.selectedAddonCodes.filter((selected) => selected !== code)
        : [...selection.selectedAddonCodes, code],
    })
  }

  if (!plan) return null

  return (
    <div className="mt-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-800">Step 1</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-stone-950 sm:text-5xl">Confirm Your Celebration Plan</h1>
      <p lang="ta" className="mt-3 text-2xl font-semibold leading-9 text-amber-900">உங்கள் விழா திட்டத்தை உறுதிப்படுத்துங்கள்</p>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">Review the fixed plan inclusions and add the optional services your family needs.</p>

      <article className="mt-8 rounded-3xl border border-amber-200 bg-white p-5 shadow-xl sm:p-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <SummaryItem label="Ceremony" value={[ceremony?.title, ceremony?.traditionalName].filter(Boolean).join('\n')} />
          <SummaryItem label="Expected Guests" value={formatPlanGuestCount(selection)} />
          <SummaryItem label="Selected Plan" value={plan.name} />
          <SummaryItem label="Session" value={formatPlanDuration(selection.ceremonyDuration)} />
        </div>

        <section className="mt-8 border-t border-amber-100 pt-6" aria-labelledby="plan-inclusions-heading">
          <h2 id="plan-inclusions-heading" className="text-2xl font-bold text-stone-950">Plan Inclusions</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {plan.sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4" aria-labelledby={`plan-section-${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>
                <h3 id={`plan-section-${section.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} className="font-bold text-stone-950">{section.title}</h3>
                <ul className="mt-3 space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 leading-7 text-stone-700">
                      <Check aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-amber-800" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-amber-100 pt-6" aria-labelledby="optional-addons-heading">
          <h2 id="optional-addons-heading" className="text-2xl font-bold text-stone-950">Optional Add-ons</h2>
          <p lang="ta" className="mt-1 font-semibold text-amber-900">கூடுதல் விருப்ப சேவைகள்</p>
          <p className="mt-2 leading-7 text-stone-600">Add these services if your family needs them.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {addonServices.map((service) => {
              const code = service.code
              if (!isCelebrationAddonCode(code)) return null
              const checked = selection.selectedAddonCodes.includes(code)
              const presentation = getCelebrationServicePresentation(service)
              return (
                <label key={service.code} className={`flex min-h-24 cursor-pointer items-start gap-4 rounded-2xl border p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-700 ${checked ? 'border-amber-800 bg-amber-50 ring-1 ring-amber-200' : 'border-amber-200 bg-white hover:bg-amber-50/50'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleAddon(code)} className="mt-1 h-5 w-5 shrink-0 accent-amber-800" />
                  <span>
                    <span className="block font-bold text-stone-950">{presentation.name}</span>
                    {code === 'transportation' && <span lang="ta" className="mt-1 block text-sm font-semibold text-amber-900">போக்குவரத்து</span>}
                    {code === 'return_gifts' && <span lang="ta" className="mt-1 block text-sm font-semibold text-amber-900">நினைவுப் பரிசுகள்</span>}
                    {presentation.description && <span className="mt-1 block text-sm leading-6 text-stone-600">{presentation.description}</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </section>
      </article>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-stone-700">
        <IndependentServiceNotice variant="planning" />
        <p className="mt-3 leading-7">Final arrangements, availability and pricing are confirmed after our team reviews your enquiry.</p>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onChangeSelection} className="min-h-12 border-amber-700 px-5 font-bold text-amber-800 hover:bg-amber-50">
          <PencilLine aria-hidden="true" className="h-5 w-5" />
          Change Plan
        </Button>
        <Button type="button" onClick={onContinue} className="min-h-12 bg-amber-800 px-5 font-bold hover:bg-amber-900">
          Continue to Details
        </Button>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-800">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-xl font-bold text-stone-950">{value}</p>
    </div>
  )
}
