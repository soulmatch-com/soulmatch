import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface CelebrationCrumb { label: string; href?: string }
export function CelebrationBreadcrumbs({ items }: { items: CelebrationCrumb[] }) {
  return <nav aria-label="Breadcrumb" className="overflow-x-auto py-4 text-sm"><ol className="flex min-w-max items-center gap-2 text-stone-600">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <ChevronRight aria-hidden="true" className="h-4 w-4 text-amber-600" />}{item.href ? <Link className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700" href={item.href}>{item.label}</Link> : <span aria-current="page" className="font-semibold text-stone-900">{item.label}</span>}</li>)}</ol></nav>
}
