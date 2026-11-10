'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatBookingDate } from '@/lib/utils'

type Booking = {
  id: string; booking_reference: string; customer_name: string | null; ceremony_type: string | null
  event_date: string | null; status: string; quoted_total: number; quotations: { quotation_number: string } | null
}
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const title = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const statuses = ['pending_confirmation', 'confirmed', 'planning', 'ready', 'completed', 'cancelled']

export function BookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [search, setSearch] = useState(''), [status, setStatus] = useState('')
  const load = (query = '') => {
    setLoading(true)
    fetch(`/api/admin/bookings?${query}`)
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setBookings(data.bookings) })
      .catch(error => setError(error instanceof Error ? error.message : 'Unable to load bookings.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  function submit(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    load(params.toString())
  }
  return <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
    <div className="border-b p-4 sm:p-5">
      <h2 className="font-semibold text-slate-900">Bookings</h2>
      <p className="mt-1 text-sm text-slate-600">Accepted quotations converted into operational booking records.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input aria-label="Search bookings" value={search} onChange={event => setSearch(event.target.value)} placeholder="Booking Reference or Customer" className="h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-base sm:col-span-2 xl:col-span-1 xl:text-sm" />
        <select aria-label="Booking status" value={status} onChange={event => setStatus(event.target.value)} className="h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base xl:text-sm">
          <option value="">All Statuses</option>{statuses.map(item => <option key={item} value={item}>{title(item)}</option>)}
        </select>
        <Button type="submit" size="sm" className="h-11">Apply Filters</Button>
      </form>
    </div>
    {error && <p role="alert" className="p-5 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="p-5 text-sm text-slate-500">Loading Bookings…</p> : !bookings.length ? <p className="p-8 text-sm text-slate-500">No bookings match these filters.</p> : <table className="block w-full text-left text-sm xl:table xl:table-fixed">
      <thead className="hidden bg-slate-50 text-xs uppercase text-slate-500 xl:table-header-group"><tr>
        <th scope="col" className="w-[16%] p-3">Reference</th><th scope="col" className="w-[18%] p-3">Customer</th><th scope="col" className="w-[12%] p-3">Ceremony</th><th scope="col" className="w-[12%] p-3">Event Date</th><th scope="col" className="w-[13%] p-3">Quotation</th><th scope="col" className="w-[14%] p-3">Status</th><th scope="col" className="w-[15%] p-3 text-right">Quoted Amount</th>
      </tr></thead>
      <tbody className="block xl:table-row-group">{bookings.map(booking => <tr key={booking.id} className="grid grid-cols-2 gap-3 border-t p-4 [overflow-wrap:anywhere] xl:table-row xl:p-0">
        <td className="col-span-2 block min-w-0 font-medium xl:table-cell xl:p-3"><Link className="inline-flex min-h-11 items-center text-slate-900 underline underline-offset-2 xl:min-h-9" href={`/admin/bookings/${booking.id}`}>{booking.booking_reference}</Link></td>
        <td className="col-span-2 block min-w-0 xl:table-cell xl:p-3"><span className="mb-1 block text-xs text-slate-500 xl:hidden">Customer</span>{booking.customer_name || 'Multiple / Unassigned'}</td>
        <td className="block min-w-0 xl:table-cell xl:p-3"><span className="mb-1 block text-xs text-slate-500 xl:hidden">Ceremony</span>{booking.ceremony_type || '—'}</td>
        <td className="block min-w-0 xl:table-cell xl:p-3"><span className="mb-1 block text-xs text-slate-500 xl:hidden">Event Date</span>{booking.event_date ? formatBookingDate(booking.event_date) : '—'}</td>
        <td className="block min-w-0 xl:table-cell xl:p-3"><span className="mb-1 block text-xs text-slate-500 xl:hidden">Quotation</span>{booking.quotations?.quotation_number || '—'}</td>
        <td className="block min-w-0 xl:table-cell xl:p-3"><span className="mb-1 block text-xs text-slate-500 xl:hidden">Status</span><span className="inline-block rounded bg-slate-100 px-2 py-1">{title(booking.status)}</span></td>
        <td className="col-span-2 block min-w-0 font-medium xl:table-cell xl:p-3 xl:text-right"><span className="mb-1 block text-xs font-normal text-slate-500 xl:hidden">Quoted Amount</span>{money.format(booking.quoted_total)}</td>
      </tr>)}</tbody>
    </table>}
  </section>
}
