'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Quotation = {
  id: string
  quotation_number: string
  status: string
  valid_until: string | null
  total_amount: number
  created_at: string
}

type Lead = { id: string; contact_name: string }
type LinkRow = { quotation_id: string; lead_id: string }

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const title = (value: string) => value.replace(/\b\w/g, letter => letter.toUpperCase())

export function QuotationList() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/quotations')
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setQuotations(data.quotations)
        setLeads(data.leads)
        setLinks(data.links)
      })
      .catch(() => setError('Unable to load quotations.'))
      .finally(() => setLoading(false))
  }, [])

  const leadNames = useMemo(() => new Map(leads.map(lead => [lead.id, lead.contact_name])), [leads])

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 className="font-semibold">All quotations</h2>
          <p className="mt-1 text-sm text-slate-600">Open a quotation to review permitted lifecycle actions.</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/admin/quotations/new"><Plus className="mr-2 h-4 w-4" />Create quotation</Link>
        </Button>
      </div>

      {error && <p role="alert" className="m-5 text-rose-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Quotation</th>
              <th scope="col" className="px-4 py-3 font-medium">Customer</th>
              <th scope="col" className="px-4 py-3 font-medium">Valid until</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map(quotation => {
              const effectiveStatus = quotation.status === 'sent' && quotation.valid_until && quotation.valid_until < new Date().toLocaleDateString('en-CA')
                ? 'expired'
                : quotation.status
              const customerNames = links
                .filter(link => link.quotation_id === quotation.id)
                .map(link => leadNames.get(link.lead_id))
                .filter(Boolean)
                .join(', ')

              return (
                <tr key={quotation.id} className="border-b last:border-b-0 hover:bg-slate-50/70">
                  <td className="px-4 py-4 font-medium text-slate-900">{quotation.quotation_number}</td>
                  <td className="max-w-64 px-4 py-4 text-slate-600">{customerNames || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{quotation.valid_until || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-900">{money.format(quotation.total_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-4"><span className="rounded bg-slate-100 px-2 py-1">{title(effectiveStatus)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/quotations/${quotation.id}/edit`}><Pencil className="mr-1 h-3 w-3" />Open</Link>
                      </Button>
                      <Button asChild size="icon" variant="outline">
                        <a href={`/api/admin/quotations/${quotation.id}/pdf`} aria-label={`Download ${quotation.quotation_number} PDF`}><Download className="h-4 w-4" /></a>
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!loading && !quotations.length && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No quotations yet.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading quotations…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
