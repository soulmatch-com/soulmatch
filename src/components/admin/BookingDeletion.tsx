'use client'

import { useState } from 'react'
import { useBookingData } from './booking-workspace-data'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BookingAlertDialogContent } from '@/components/admin/BookingDialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export function BookingDeletion({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const { data } = useBookingData(bookingId)
  const status = data?.booking.status
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  if (!status || !['pending_confirmation', 'cancelled'].includes(status)) return null
  async function remove() {
    setDeleting(true); setError('')
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, { method: 'DELETE' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to delete booking')
      router.replace('/admin/bookings'); router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete booking'); setDeleting(false); setOpen(false) }
  }
  return <section className="rounded-xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-semibold text-rose-950">Delete booking</h2><p className="mt-1 text-sm text-rose-800">This permanently removes the booking and its planning, vendor, service, and activity records. It is available only before confirmation or after cancellation.</p>{error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}<Button className="mt-4" size="sm" variant="destructive" onClick={() => setOpen(true)}><Trash2 className="mr-1 h-4 w-4" />Delete booking</Button><AlertDialog open={open} onOpenChange={(value) => !deleting && setOpen(value)}><BookingAlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this booking?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. The booking&apos;s service snapshots, planning tasks, vendor assignments, and activity history will be permanently removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:space-x-0"><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={deleting} onClick={() => void remove()}>{deleting ? 'Deleting…' : 'Delete booking'}</AlertDialogAction></AlertDialogFooter></BookingAlertDialogContent></AlertDialog></section>
}
