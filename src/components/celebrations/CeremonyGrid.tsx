import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ceremonies } from '@/lib/celebrations'

export function CeremonyGrid() {
  return <div className="grid gap-6 md:grid-cols-3">{ceremonies.map((ceremony) => <article key={ceremony.slug} className="group flex min-w-0 flex-col rounded-3xl border border-amber-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-end gap-2"><span className="text-6xl font-black leading-none text-amber-800">{ceremony.years}</span><span className="pb-1 text-sm font-bold uppercase tracking-wider text-stone-500">years</span></div><h3 className="mt-6 text-2xl font-bold text-stone-900">{ceremony.title}</h3><p className="mt-1 font-semibold text-amber-800">{ceremony.traditionalName}</p><p lang="ta" className="mt-3 text-base leading-relaxed text-stone-600">{ceremony.tamilName}</p><p className="mt-4 flex-1 leading-relaxed text-stone-600">{ceremony.summary}</p><Link href={`/${ceremony.slug}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">View {ceremony.years}th Marriage <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-1" /></Link></article>)}</div>
}
