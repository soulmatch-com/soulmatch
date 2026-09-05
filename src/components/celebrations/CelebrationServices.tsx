import { BedDouble, Bus, Camera, Church, CircleEllipsis, Gift, Mail, Music2, Palette, Sparkles, UtensilsCrossed, Video, WandSparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PublicCelebrationService } from '@/lib/celebrations/services'

const icons: Record<string, LucideIcon> = { priest: Church, pooja: Sparkles, venue: Church, temple: Church, food: UtensilsCrossed, decoration: Palette, camera: Camera, video: Video, music: Music2, hotel: BedDouble, transport: Bus, invitation: Mail, gift: Gift, complete: WandSparkles }
export function getCelebrationServiceIcon(icon: string | null) { return (icon && icons[icon]) || CircleEllipsis }
export function CelebrationServices({ services }: { services: PublicCelebrationService[] }) {
  if (services.length === 0) return <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-stone-700">No celebration services are currently listed. Please try again shortly.</p>
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.map((service) => { const Icon = getCelebrationServiceIcon(service.icon); return <li key={service.id} className="flex min-w-0 gap-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><Icon aria-hidden="true" className="h-5 w-5" /></span><div className="min-w-0"><h3 className="break-words font-bold text-stone-900">{service.name}</h3>{service.description && <p className="mt-1 break-words text-sm leading-relaxed text-stone-600">{service.description}</p>}</div></li> })}</ul>
}
