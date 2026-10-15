import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BookingDetail } from '@/components/admin/BookingDetail'
import { EventPlanning } from '@/components/admin/EventPlanning'
import { VendorCoordination } from '@/components/admin/VendorCoordination'
import { CustomerPayments } from '@/components/admin/CustomerPayments'
export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <div className="container mx-auto max-w-5xl px-4 py-10"><Link href="/admin/bookings" className="inline-flex items-center text-sm font-medium text-slate-700"><ArrowLeft className="mr-1 h-4 w-4"/>Back to bookings</Link><div className="mt-6 space-y-6"><BookingDetail id={id}/><CustomerPayments bookingId={id}/><EventPlanning bookingId={id}/><VendorCoordination bookingId={id}/></div></div> }
