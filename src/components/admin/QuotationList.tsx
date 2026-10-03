'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Quotation = { id: string; quotation_number: string; status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'; valid_until: string | null; total_amount: number; created_at: string }
type Lead = { id: string; contact_name: string }
type LinkRow = { quotation_id: string; lead_id: string }
const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const title = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

export function QuotationList() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { fetch('/api/admin/quotations').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load quotations.'); setQuotations(data.quotations); setLeads(data.leads); setLinks(data.links) }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load quotations.')).finally(() => setLoading(false)) }, [])
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead.contact_name])), [leads])
  async function updateStatus(id: string, status: string) {
    setSavingId(id); setError('')
    try { const response = await fetch(`/api/admin/quotations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to update quotation.'); setQuotations((current) => current.map((quotation) => quotation.id === id ? data.quotation : quotation)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update quotation.') } finally { setSavingId(null) }
  }
  return <section className="rounded-xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><h2 className="font-semibold text-slate-900">All quotations</h2><p className="mt-1 text-sm text-slate-600">Manage every created quotation from one list.</p></div><Button asChild><Link href="/admin/quotations/new"><Plus className="mr-2 h-4 w-4" />Create quotation</Link></Button></div>{error && <p role="alert" className="m-5 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Quotation</th><th className="px-5 py-3">Linked leads</th><th className="px-5 py-3">Valid until</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{quotations.map((quotation) => { const linkedNames = links.filter((link) => link.quotation_id === quotation.id).map((link) => leadsById.get(link.lead_id)).filter(Boolean); return <tr key={quotation.id}><td className="px-5 py-4"><p className="font-medium text-slate-900">{quotation.quotation_number}</p><p className="mt-1 text-xs text-slate-500">{new Date(quotation.created_at).toLocaleDateString()}</p></td><td className="px-5 py-4 text-slate-700">{linkedNames.length ? linkedNames.join(', ') : '—'}</td><td className="px-5 py-4 text-slate-700">{quotation.valid_until ? new Date(`${quotation.valid_until}T00:00:00`).toLocaleDateString() : '—'}</td><td className="px-5 py-4 font-medium text-slate-900">{money.format(quotation.total_amount)}</td><td className="px-5 py-4"><select aria-label={`Status for ${quotation.quotation_number}`} disabled={savingId === quotation.id} value={quotation.status} onChange={(event) => void updateStatus(quotation.id, event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm">{statuses.map((status) => <option key={status} value={status}>{title(status)}</option>)}</select></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/admin/quotations/${quotation.id}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link></Button><Button asChild size="sm" variant="outline"><a href={`/api/admin/quotations/${quotation.id}/pdf`}><Download className="mr-2 h-4 w-4" />PDF</a></Button></div></td></tr> })}{!loading && quotations.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No quotations yet. Create the first quotation to start managing it here.</td></tr>}{loading && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading quotations…</td></tr>}</tbody></table></div></section>
}
