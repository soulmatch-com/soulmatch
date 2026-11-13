import type { ReactNode } from 'react'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { bookingLabel } from './booking-workspace-data'
import styles from './BookingWorkspace.module.css'

export function BookingCard({ title, icon: Icon, action, subtitle, children }: { title: string; icon: LucideIcon; action?: ReactNode; subtitle?: string; children: ReactNode }) {
  return <section className={`h-full ${styles.card}`}><div className={styles.cardHeader}><h2 className={styles.cardTitle}><span className={styles.icon}><Icon aria-hidden="true" /></span><span>{title}{subtitle && <span className="ml-1 text-xs font-normal">({subtitle})</span>}</span></h2>{action}</div>{children}</section>
}

export function BookingBadge({ status }: { status: string }) {
  const colors = ['completed', 'confirmed', 'paid', 'fully_paid', 'fulfilled'].includes(status) ? 'bg-emerald-100 text-emerald-800' : ['cancelled', 'declined', 'unpaid'].includes(status) ? 'bg-rose-100 text-rose-800' : ['pending', 'pending_confirmation', 'partially_paid'].includes(status) ? 'bg-amber-100 text-amber-900' : 'bg-violet-100 text-violet-800'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colors}`}>{bookingLabel(status)}</span>
}

export function BookingProgress({ value, label }: { value: number; label: string }) {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return <div role="progressbar" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} className={styles.progress}><span style={{ width: `${percent}%` }} /></div>
}

export function BookingViewLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" className={styles.textLink} onClick={onClick}>{children}<ArrowRight className="size-3.5" aria-hidden="true" /></button>
}
