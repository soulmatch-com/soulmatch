import type { LucideIcon } from 'lucide-react'

type PlanningStep = readonly [string, string] | {
  title: string
  description: string
  icon?: LucideIcon
}

const defaultSteps = [['Choose Your Ceremony', 'Select the milestone your family is preparing to celebrate.'], ['Tell Us Your Requirements', 'Share your dates, guest needs and the support you would like to request.'], ['Coordinate the Arrangements', 'Discuss availability, responsibilities and the practical plan.'], ['Celebrate With Your Family', 'Gather your loved ones for a celebration shaped around your traditions.']] as const

function getStepContent(step: PlanningStep) {
  if ('title' in step) {
    return { title: step.title, description: step.description, Icon: step.icon }
  }

  return { title: step[0], description: step[1], Icon: undefined }
}

export function PlanningSteps({ steps = defaultSteps, variant = 'simple' }: { steps?: ReadonlyArray<PlanningStep>; variant?: 'simple' | 'card' }) {
  const isCard = variant === 'card'
  return <ol className={`grid gap-5 sm:grid-cols-2 ${isCard ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>{steps.map((step, index) => {
    const { title, description, Icon } = getStepContent(step)
    return <li key={title} className={isCard ? 'min-w-0 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm' : undefined}><div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-900 font-bold text-amber-300">{index + 1}</span>{Icon && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Icon aria-hidden="true" className="h-5 w-5" /></span>}</div><h3 className="mt-4 text-lg font-bold text-stone-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p></li>
  })}</ol>
}
