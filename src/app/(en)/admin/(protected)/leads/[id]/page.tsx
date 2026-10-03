'use client'

import Link from 'next/link'
import { FormEvent, use, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Lead = { id: string; source: string; status: string; contact_name: string; mobile: string | null; email: string | null; requirement_summary: string | null; event_date: string | null; event_type: string | null; event_session: string | null; total_members: number | null; next_follow_up_at: string | null; created_at: string }
type Note = { id: string; body: string; created_at: string }
const statuses = ['new', 'contacted', 'follow_up', 'qualified', 'confirmed', 'completed', 'lost']
const label = (value: string) => value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [lead, setLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [totalMembersDraft, setTotalMembersDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const totalMembersTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetch(`/api/admin/leads/${id}`).then(async (response) => {
      if (!response.ok) return setError('Lead could not be found.')
      const data = await response.json()
      setLead(data.lead); setNotes(data.notes); setTotalMembersDraft(data.lead.total_members?.toString() || '')
    }).catch(() => setError('Lead could not be loaded.'))
  }, [id])
  useEffect(() => () => { if (totalMembersTimer.current) clearTimeout(totalMembersTimer.current) }, [])

  async function update(values: Record<string, string | number | null>) {
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setLead(data.lead)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save changes.') } finally { setSaving(false) }
  }
  function scheduleTotalMembers(value: string) {
    setTotalMembersDraft(value)
    if (totalMembersTimer.current) clearTimeout(totalMembersTimer.current)
    totalMembersTimer.current = setTimeout(() => { void update({ totalMembers: value ? Number(value) : null }) }, 600)
  }
  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!noteBody.trim()) return; setSaving(true)
    try {
      const response = await fetch(`/api/admin/leads/${id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: noteBody }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error); setNotes((current) => [data.note, ...current]); setNoteBody('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save note.') } finally { setSaving(false) }
  }
  if (!lead && !error) return <div className="container mx-auto px-4 py-10 text-slate-600">Loading lead…</div>
  if (!lead) return <div className="container mx-auto px-4 py-10"><Link href="/admin/leads" className="text-sm font-medium text-slate-700">← Back to leads</Link><p className="mt-6 text-rose-700">{error}</p></div>
  const phone = lead.mobile?.replace(/\D/g, '')
  return <div className="container mx-auto max-w-5xl px-4 py-10"><Link href="/admin/leads" className="inline-flex items-center text-sm font-medium text-slate-700"><ArrowLeft className="mr-1 h-4 w-4" />Back to leads</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">{label(lead.source)} lead</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{lead.contact_name}</h1><p className="mt-2 text-slate-600">Received {new Date(lead.created_at).toLocaleString()}</p></div><div className="flex gap-2">{phone && <Button asChild variant="outline"><a href={`tel:${phone}`}><Phone className="mr-2 h-4 w-4" />Call</a></Button>}{phone && <Button asChild variant="outline"><a target="_blank" href={`https://wa.me/91${phone.slice(-10)}`}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>}{lead.email && <Button asChild variant="outline"><a href={`mailto:${lead.email}`}><Mail className="mr-2 h-4 w-4" />Email</a></Button>}</div></div>{error && <p role="alert" className="mt-5 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"> <section className="space-y-6"><div className="rounded-xl border bg-white p-5"><h2 className="font-semibold text-slate-900">Requirement</h2><p className="mt-3 whitespace-pre-wrap text-slate-700">{lead.requirement_summary || 'No summary recorded.'}</p></div><div className="rounded-xl border bg-white p-5"><h2 className="font-semibold text-slate-900">Follow-up notes</h2><form onSubmit={addNote} className="mt-4"><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} maxLength={2000} rows={3} placeholder="Record a call, message, or next step…" className="w-full rounded-md border border-slate-300 p-3 text-sm" /><div className="mt-3 flex justify-end"><Button disabled={saving || !noteBody.trim()} type="submit">Add note</Button></div></form><div className="mt-5 space-y-4">{notes.map((note) => <article key={note.id} className="border-t pt-4 first:border-t-0 first:pt-0"><p className="whitespace-pre-wrap text-sm text-slate-800">{note.body}</p><p className="mt-2 text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</p></article>)}{notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}</div></div></section><aside className="space-y-5"><div className="rounded-xl border bg-white p-5"><label className="text-sm font-medium text-slate-700">Pipeline status</label><select disabled={saving} value={lead.status} onChange={(event) => update({ status: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div><div className="rounded-xl border bg-white p-5"><label className="text-sm font-medium text-slate-700">Event type</label><select disabled={saving} value={lead.event_type || ''} onChange={(event) => update({ eventType: event.target.value || null })} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Not selected</option><option value="60th-marriage">60th Marriage</option><option value="70th-marriage">70th Marriage</option><option value="80th-marriage">80th Marriage</option></select></div><div className="rounded-xl border bg-white p-5"><label className="text-sm font-medium text-slate-700">Session</label><select disabled={saving} value={lead.event_session || ''} onChange={(event) => update({ eventSession: event.target.value || null })} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Not selected</option><option value="one_session">1 session</option><option value="two_sessions">2 sessions</option></select></div><div className="rounded-xl border bg-white p-5"><label className="text-sm font-medium text-slate-700">Event date</label><input disabled={saving} type="date" value={lead.event_date || ''} onChange={(event) => update({ eventDate: event.target.value || null })} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></div><div className="rounded-xl border bg-white p-5"><label className="text-sm font-medium text-slate-700">Total members</label><input disabled={saving} type="number" min="1" max="10000" value={totalMembersDraft} onChange={(event) => scheduleTotalMembers(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /><p className="mt-2 text-xs text-slate-500">Saves 0.6 seconds after you finish changing the number.</p></div><div className="rounded-xl border bg-white p-5"><label className="text-sm font-medium text-slate-700">Next follow-up</label><input disabled={saving} type="datetime-local" value={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : ''} onChange={(event) => update({ nextFollowUpAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></div></aside></div></div>
}
