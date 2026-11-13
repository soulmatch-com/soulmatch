import { Suspense } from 'react'
import { BookingWorkspace } from '@/components/admin/BookingWorkspace'

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading booking workspace…</p>}><BookingWorkspace key={id} id={id} /></Suspense>
}
