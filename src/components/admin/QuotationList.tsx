'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyQuotationButton } from '@/components/admin/CopyQuotationButton'

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
    <section className="min-w-0 rounded-xl border bg-white">
      <div className="flex flex-col items-start justify-between gap-4 border-b p-4 sm:flex-row sm:p-5">
        <div className="min-w-0">
          <h2 className="font-semibold">All quotations</h2>
          <p className="mt-1 text-sm text-slate-600">Open a quotation to review permitted lifecycle actions.</p>
        </div>
        <Button asChild className="h-11 w-full shrink-0 sm:w-auto xl:h-9">
          <Link href="/admin/quotations/new"><Plus className="mr-2 h-4 w-4" />Create quotation</Link>
        </Button>
      </div>

      {error && <p role="alert" className="m-5 text-rose-700">{error}</p>}

      <table className="block w-full text-left text-sm xl:table xl:table-fixed">
        <thead className="hidden border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500 xl:table-header-group">
          <tr>
            <th scope="col" className="w-[18%] px-4 py-3 font-medium">Quotation</th>
            <th scope="col" className="w-[19%] px-4 py-3 font-medium">Customer</th>
            <th scope="col" className="w-[12%] px-4 py-3 font-medium">Valid until</th>
            <th scope="col" className="w-[16%] px-4 py-3 text-right font-medium">Total</th>
            <th scope="col" className="w-[12%] px-4 py-3 font-medium">Status</th>
            <th scope="col" className="w-[23%] px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="block xl:table-row-group">
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
              <tr key={quotation.id} className="grid grid-cols-2 items-start gap-3 border-b p-4 last:border-b-0 hover:bg-slate-50/70 xl:table-row xl:p-0">
                <td className="block min-w-0 font-medium text-slate-900 [overflow-wrap:anywhere] xl:table-cell xl:px-4 xl:py-4">{quotation.quotation_number}</td>
                <td className="col-span-2 row-start-2 block min-w-0 text-slate-600 [overflow-wrap:anywhere] xl:table-cell xl:px-4 xl:py-4">
                  <span className="mb-1 block text-xs text-slate-500 xl:hidden">Customer</span>
                  {customerNames || '—'}
                </td>
                <td className="row-start-3 block min-w-0 text-slate-600 xl:table-cell xl:px-4 xl:py-4">
                  <span className="mb-1 block text-xs text-slate-500 xl:hidden">Valid until</span>
                  {quotation.valid_until || '—'}
                </td>
                <td className="row-start-3 block min-w-0 text-right font-medium text-slate-900 [overflow-wrap:anywhere] xl:table-cell xl:px-4 xl:py-4">
                  <span className="mb-1 block text-xs font-normal text-slate-500 xl:hidden">Total</span>
                  {money.format(quotation.total_amount)}
                </td>
                <td className="col-start-2 row-start-1 block min-w-0 text-right xl:table-cell xl:px-4 xl:py-4 xl:text-left">
                  <span className="sr-only">Status: </span>
                  <span className="inline-block rounded bg-slate-100 px-2 py-1 [overflow-wrap:anywhere]">{title(effectiveStatus)}</span>
                </td>
                <td className="col-span-2 row-start-4 block min-w-0 xl:table-cell xl:px-4 xl:py-3">
                  <div className="grid grid-cols-2 gap-2 xl:flex xl:flex-wrap xl:justify-end">
                    <Button asChild size="icon" variant="outline" className="size-11 xl:size-9">
                      <Link href={`/admin/quotations/${quotation.id}/edit`} aria-label={`Open ${quotation.quotation_number}`} title="Open quotation"><Pencil aria-hidden="true" className="h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 px-2 xl:size-9 xl:shrink-0 xl:p-0">
                      <a href={`/api/admin/quotations/${quotation.id}/pdf`} aria-label={`Download ${quotation.quotation_number} PDF`}><Download className="h-4 w-4 shrink-0" /><span className="xl:hidden">PDF</span></a>
                    </Button>
                    <CopyQuotationButton quotationId={quotation.id} />
                  </div>
                </td>
              </tr>
            )
          })}
          {!loading && !quotations.length && (
            <tr className="block xl:table-row"><td colSpan={6} className="block p-8 text-center text-slate-500 xl:table-cell">No quotations yet.</td></tr>
          )}
          {loading && (
            <tr className="block xl:table-row"><td colSpan={6} className="block p-8 text-center text-slate-500 xl:table-cell">Loading quotations…</td></tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
