'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ExternalLink, Filter, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Lead = {
  id: string; source: string; status: string; contact_name: string; mobile: string | null; email: string | null
  requirement_summary: string | null; event_type: string | null; event_date: string | null; event_session: string | null; total_members: number | null; next_follow_up_at: string | null; created_at: string
}
type LeadStats = { newToday: number; pendingFollowUps: number; overdueFollowUps: number; confirmed: number }

const statuses = ['all', 'new', 'contacted', 'follow_up', 'qualified', 'confirmed', 'completed', 'lost', 'expired']
const sources = ['all', 'website', 'instagram', 'whatsapp', 'call', 'referral', 'other']
const label = (value: string) => value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const statusClass: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800', contacted: 'bg-amber-100 text-amber-800', follow_up: 'bg-violet-100 text-violet-800',
  qualified: 'bg-cyan-100 text-cyan-800', confirmed: 'bg-emerald-100 text-emerald-800', completed: 'bg-green-100 text-green-800', lost: 'bg-rose-100 text-rose-800', expired: 'bg-slate-200 text-slate-700',
}
const eventTypeLabel: Record<string, string> = { '60th-marriage': '60th Marriage', '70th-marriage': '70th Marriage', '80th-marriage': '80th Marriage' }
const sessionLabel: Record<string, string> = { one_session: '1 session', two_sessions: '2 sessions' }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<LeadStats | null>(null)

  useEffect(() => { fetch('/api/admin/leads/stats').then(async (response) => { if (response.ok) setStats(await response.json()) }).catch(() => undefined) }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (source !== 'all') params.set('source', source)
      if (search.trim()) params.set('q', search.trim())
      try {
        const response = await fetch(`/api/admin/leads?${params}`, { signal: controller.signal })
        if (response.ok) setLeads((await response.json()).leads)
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [status, source, search])

  return <div className="container mx-auto min-w-0 max-w-7xl px-4 py-10">
    <div className="mb-5 flex justify-end">
      <Button asChild className="h-11 w-full sm:w-auto xl:h-10"><Link href="/admin/leads/new"><Plus className="mr-2 h-4 w-4" />Add lead</Link></Button>
    </div>
    {stats && <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[['New today', stats.newToday, 'text-blue-700'], ['Follow-ups due', stats.pendingFollowUps, 'text-amber-700'], ['Overdue', stats.overdueFollowUps, 'text-rose-700'], ['Confirmed', stats.confirmed, 'text-emerald-700']].map(([title, value, colour]) => <div key={String(title)} className="min-w-0 rounded-xl border bg-white p-4"><p className="text-sm text-slate-600">{title}</p><p className={`mt-1 break-words text-2xl font-bold ${colour}`}>{value}</p></div>)}
    </div>}
    <div className="mb-5 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
      <label className="relative min-w-0 sm:col-span-2 xl:col-span-1">
        <span className="sr-only">Search leads</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, mobile or email" className="h-11 w-full min-w-0 rounded-md border border-slate-300 pl-9 pr-3 text-base xl:text-sm" />
      </label>
      <label className="relative min-w-0">
        <span className="sr-only">Lead source</span>
        <Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <select value={source} onChange={(event) => setSource(event.target.value)} className="h-11 w-full min-w-0 appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-3 text-base xl:text-sm">{sources.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
      </label>
      <select aria-label="Lead status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base xl:text-sm">{statuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'All active leads' : label(item)}</option>)}</select>
    </div>
    <section aria-label="Leads list" className="min-w-0 overflow-hidden rounded-xl border bg-white">
      <table className="block w-full text-left text-sm xl:table xl:table-fixed">
        <thead className="hidden border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500 xl:table-header-group">
          <tr>
            <th scope="col" className="w-[22%] px-4 py-3">Lead</th>
            <th scope="col" className="w-[12%] px-3 py-3">Event</th>
            <th scope="col" className="w-[10%] px-3 py-3">Date</th>
            <th scope="col" className="w-[13%] px-3 py-3">Session / Members</th>
            <th scope="col" className="w-[9%] px-3 py-3">Source</th>
            <th scope="col" className="w-[12%] px-3 py-3">Status</th>
            <th scope="col" className="w-[10%] px-3 py-3">Follow-up</th>
            <th scope="col" className="w-[12%] px-3 py-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="block divide-y xl:table-row-group">
          {leads.map((lead) => <tr key={lead.id} className="grid grid-cols-2 items-start gap-3 p-4 hover:bg-slate-50 xl:table-row xl:p-0">
            <td className="col-span-2 row-start-1 block min-w-0 [overflow-wrap:anywhere] xl:table-cell xl:px-4 xl:py-4">
              <p className="font-medium text-slate-900">{lead.contact_name}</p>
              <p className="mt-1 text-slate-500">{lead.mobile || lead.email || 'No contact detail'}</p>
            </td>
            <td className="col-start-1 row-start-3 block min-w-0 text-slate-700 [overflow-wrap:anywhere] xl:table-cell xl:px-3 xl:py-4">
              <span className="mb-1 block text-xs text-slate-500 xl:hidden">Event</span>
              {lead.event_type ? eventTypeLabel[lead.event_type] : '—'}
            </td>
            <td className="col-start-2 row-start-3 block min-w-0 text-slate-700 [overflow-wrap:anywhere] xl:table-cell xl:px-3 xl:py-4">
              <span className="mb-1 block text-xs text-slate-500 xl:hidden">Date</span>
              {lead.event_date ? new Date(`${lead.event_date}T00:00:00`).toLocaleDateString() : '—'}
            </td>
            <td className="col-start-1 row-start-4 block min-w-0 text-slate-700 xl:table-cell xl:px-3 xl:py-4">
              <span className="mb-1 block text-xs text-slate-500 xl:hidden">Session / Members</span>
              <p>{lead.event_session ? sessionLabel[lead.event_session] : '—'}</p>
              {lead.total_members && <p className="mt-1 break-words text-xs text-slate-500">{lead.total_members} members</p>}
            </td>
            <td className="col-start-2 row-start-2 block min-w-0 [overflow-wrap:anywhere] xl:table-cell xl:px-3 xl:py-4">
              <span className="mb-1 block text-xs text-slate-500 xl:hidden">Source</span>
              {label(lead.source)}
            </td>
            <td className="col-start-1 row-start-2 block min-w-0 xl:table-cell xl:px-3 xl:py-4">
              <span className="mb-1 block text-xs text-slate-500 xl:hidden">Status</span>
              <Badge className={`max-w-full border-0 ${statusClass[lead.status] || ''}`}>{label(lead.status)}</Badge>
            </td>
            <td className="col-start-2 row-start-4 block min-w-0 text-slate-600 [overflow-wrap:anywhere] xl:table-cell xl:px-3 xl:py-4">
              <span className="mb-1 block text-xs text-slate-500 xl:hidden">Follow-up</span>
              {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : '—'}
            </td>
            <td className="col-span-2 row-start-5 block min-w-0 xl:table-cell xl:px-3 xl:py-4">
              <Button asChild variant="outline" size="sm" className="h-11 w-full xl:h-9"><Link href={`/admin/leads/${lead.id}`}>Open <ExternalLink className="h-3.5 w-3.5 shrink-0" /></Link></Button>
            </td>
          </tr>)}
          {!loading && leads.length === 0 && <tr className="block xl:table-row"><td colSpan={8} className="block px-5 py-12 text-center text-slate-500 xl:table-cell">No leads match these filters.</td></tr>}
          {loading && <tr className="block xl:table-row"><td colSpan={8} className="block px-5 py-12 text-center text-slate-500 xl:table-cell">Loading leads…</td></tr>}
        </tbody>
      </table>
    </section>
  </div>
}
