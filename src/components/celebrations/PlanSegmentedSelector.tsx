'use client'

import type { ReactNode } from 'react'

type SegmentedOption<TValue extends string> = {
  value: TValue
  label: string
  accessibleLabel?: string
}

export function PlanSegmentedSelector<TValue extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  children,
}: {
  legend: string
  name: string
  value?: TValue
  options: readonly SegmentedOption<TValue>[]
  onChange: (value: TValue) => void
  children?: ReactNode
}) {
  return (
    <fieldset className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
      <legend className="px-1 text-sm font-bold uppercase tracking-[0.16em] text-amber-800">{legend}</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <label key={option.value} className="min-h-12 cursor-pointer rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-3 text-center font-bold text-stone-700 transition-colors has-[:checked]:border-amber-800 has-[:checked]:bg-amber-800 has-[:checked]:text-white">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={option.accessibleLabel ?? option.label}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {children}
    </fieldset>
  )
}
