'use client'

import Link from 'next/link'
import { FormEvent, use, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, CalendarDays, Check, ChevronDown, ClipboardList, Copy, Download, Edit3, FileText, Instagram, Mail, MessageCircle, Phone, Plus, UserRound, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Lead = { id: string; source: string; status: string; contact_name: string; mobile: string | null; email: string | null; requirement_summary: string | null; event_date: string | null; event_end_date: string | null; event_type: string | null; event_session: string | null; package_type: 'basic' | 'premium' | null; total_members: number | null; next_follow_up_at: string | null; created_at: string }
type Note = { id: string; body: string; created_at: string }
type Enquiry = { celebration_type: string; preferred_date: string; expected_guest_count: number | null; arrangement_preference: string; plan_type: string | null }
type Quotation = { id: string; quotation_number: string; status: string; total_amount: number; created_at: string }
const stages = ['new', 'contacted', 'follow_up', 'qualified', 'confirmed']
const label = (value: string) => value === 'basic' ? 'Standard' : value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const dateLabel = (value: string | null) => value ? new Date(value.includes('T') ? value : `${value}T00:00:00`).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(value.includes('T') ? { hour: 'numeric', minute: '2-digit' } : {}) }) : 'Not provided'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [lead, setLead] = useState<Lead | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [noteBody, setNoteBody] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const followUp = useRef<HTMLInputElement>(null)
  const editPanel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/admin/leads/${id}`).then(async response => {
      if (!response.ok) throw new Error('Lead could not be found.')
      const data = await response.json()
      setLead(data.lead); setNotes(data.notes); setEnquiry(data.enquiry)
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Lead could not be loaded.'))
    fetch(`/api/admin/leads/${id}/quotations`).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setQuotations(data.quotations)
    }).catch(() => setError('Linked quotations could not be loaded.'))
  }, [id])
  useEffect(() => {
    if (!editing) return
    const frame = requestAnimationFrame(() => editPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [editing])

  async function update(values: Record<string, string | number | null>) {
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/admin/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setLead(data.lead)
      return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save changes.'); return false } finally { setSaving(false) }
  }
  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!noteBody.trim()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/leads/${id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: noteBody }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      setNotes(current => [data.note, ...current]); setNoteBody('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save note.') } finally { setSaving(false) }
  }
  if (!lead && !error) return <div className="container mx-auto px-4 py-10 text-slate-600">Loading lead…</div>
  if (!lead) return <div className="container mx-auto px-4 py-10"><Link href="/admin/leads">← Back to leads</Link><p className="mt-6 text-rose-700">{error}</p></div>

  const terminal = ['expired', 'lost'].includes(lead.status)
  const stage = stages.indexOf(lead.status)
  const sourceIcon = lead.source === 'instagram' ? <Instagram className="size-5 text-pink-600" /> : <UserRound className="size-5 text-violet-600" />
  return <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
    <div className="flex items-center gap-2 text-sm text-slate-500"><Link href="/admin/leads" className="inline-flex items-center gap-1 hover:text-violet-700"><ArrowLeft className="size-4" />Leads</Link><span>/</span><span className="font-medium text-slate-800">{lead.contact_name}</span></div>
    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Lead Details</h1>
    <section className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
      <div className="flex min-w-0 items-center gap-4"><div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-violet-100 text-3xl font-semibold text-rose-600">{lead.contact_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-2xl font-bold text-slate-950">{lead.contact_name}</h2>{terminal && <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">{label(lead.status)}</span>}</div><p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">{sourceIcon}<span className="font-medium">{label(lead.source)} Lead</span><span>•</span><span>Received {dateLabel(lead.created_at)}</span></p><p className="mt-2 inline-flex items-center gap-2 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-950">Lead ID: {lead.id}<button aria-label="Copy lead ID" onClick={() => navigator.clipboard?.writeText(lead.id)}><Copy className="size-3.5" /></button></p></div></div>
      <div className="flex flex-wrap gap-2"><Button asChild><Link href={`/admin/quotations/new?leadId=${lead.id}`}><Plus className="mr-2 size-4" />Create quotation</Link></Button><Button variant="outline" onClick={() => setEditing(current => !current)}><Edit3 className="mr-2 size-4" />{editing ? 'Close edit' : 'Edit lead'}</Button><Button variant="outline" size="icon" aria-label="More lead actions"><ChevronDown className="size-4" /></Button></div>
    </div></section>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.42fr)_minmax(360px,0.9fr)]"><div className="space-y-5">
      <Card title="Pipeline Status" icon={ClipboardList}><div className="mt-6 grid grid-cols-5 gap-1">{stages.map((item, index) => { const complete = stage >= index && !terminal; return <div key={item} className="relative text-center"><div className={`mx-auto grid size-7 place-items-center rounded-full border-2 ${complete ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>{complete && <Check className="size-4" />}</div>{index < stages.length - 1 && <div className={`absolute left-[calc(50%+14px)] top-3 h-0.5 w-[calc(100%-28px)] ${stage > index && !terminal ? 'bg-violet-500' : 'bg-slate-200'}`} />}<p className="mt-2 text-xs font-medium text-slate-700 sm:text-sm">{label(item)}</p></div> })}</div><div className="mt-5 flex justify-end"><select aria-label="Pipeline status" disabled={saving} value={lead.status} onChange={event => void update({ status: event.target.value })} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm">{[...stages, 'completed', 'lost', 'expired'].map(item => <option key={item} value={item}>{label(item)}</option>)}</select></div></Card>
      <Card title="Customer Requirement" icon={FileText}><p className="mt-4 rounded-xl bg-violet-50/70 p-4 text-sm leading-6 text-slate-800">{lead.requirement_summary || 'No requirement has been recorded.'}</p></Card>
      <Card title="Event Information" icon={CalendarDays}><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Info label="Event type" value={lead.event_type ? label(lead.event_type) : enquiry ? label(enquiry.celebration_type) : 'Not provided'} icon={UsersRound} /><Info label="Package type" value={lead.package_type ? label(lead.package_type) : enquiry?.plan_type ? label(enquiry.plan_type) : 'Not provided'} icon={FileText} /><Info label="Session" value={lead.event_session ? label(lead.event_session) : 'Not provided'} icon={CalendarDays} /><Info label="Event date" value={dateLabel(lead.event_date || enquiry?.preferred_date || null)} icon={CalendarDays} /><Info label="Total members" value={lead.total_members?.toString() || enquiry?.expected_guest_count?.toString() || 'Not provided'} icon={UsersRound} /><Info label="Arrangement" value={enquiry ? label(enquiry.arrangement_preference) : 'Not provided'} icon={ClipboardList} /></div></Card>
      <Card title="Contact Information" icon={UserRound}><div className="mt-4 flex flex-col justify-between gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-950">{lead.contact_name}</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Phone className="size-4 text-violet-600" />{lead.mobile || 'Not provided'}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Mail className="size-4 text-violet-600" />{lead.email || 'Not provided'}</p></div>{lead.mobile && <div className="flex gap-2"><Button asChild variant="outline" size="sm"><a href={`tel:${lead.mobile}`}><Phone className="mr-1.5 size-4" />Call</a></Button><Button asChild variant="outline" size="sm"><a target="_blank" href={`https://wa.me/91${lead.mobile.replace(/\D/g, '').slice(-10)}`}><MessageCircle className="mr-1.5 size-4" />WhatsApp</a></Button></div>}</div></Card>
      {editing && <div ref={editPanel} tabIndex={-1}><EditPanel lead={lead} saving={saving} onSave={update} /></div>}
    </div><aside className="space-y-5">
      <Card title="Next Follow-up" icon={CalendarDays}><div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-violet-50 p-4"><div><p className="font-semibold text-slate-950">{dateLabel(lead.next_follow_up_at)}</p><p className="mt-1 text-xs text-slate-600">{lead.next_follow_up_at ? 'Scheduled follow-up' : 'No follow-up scheduled'}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{lead.next_follow_up_at ? 'Scheduled' : 'Unscheduled'}</span></div><div className="mt-3 grid grid-cols-3 gap-2"><Button variant="outline" size="sm" disabled={!lead.next_follow_up_at || saving} onClick={() => void update({ nextFollowUpAt: null })}><Check className="mr-1 size-4" />Done</Button><Button variant="outline" size="sm" onClick={() => followUp.current?.focus()}><CalendarDays className="mr-1 size-4" />Date</Button><Button variant="outline" size="sm" onClick={() => followUp.current?.focus()}><Bell className="mr-1 size-4" />Reminder</Button></div><input ref={followUp} aria-label="Next follow-up date" disabled={saving} type="datetime-local" value={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : ''} onChange={event => void update({ nextFollowUpAt: event.target.value ? new Date(event.target.value).toISOString() : null })} className="mt-3 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></Card>
      <Card title="Follow-up Notes" icon={MessageCircle}><div className="mt-4 space-y-4">{notes.length ? notes.map(note => <article key={note.id} className="relative border-l-2 border-violet-200 pl-4 before:absolute before:-left-[5px] before:top-1.5 before:size-2 before:rounded-full before:bg-violet-600"><p className="rounded-lg bg-violet-50 p-3 text-sm text-slate-800">{note.body}</p><p className="mt-1 text-xs text-slate-500">{dateLabel(note.created_at)}</p></article>) : <p className="text-sm text-slate-500">No follow-up notes yet.</p>}</div><form onSubmit={addNote} className="mt-5"><textarea value={noteBody} onChange={event => setNoteBody(event.target.value)} maxLength={2000} rows={3} placeholder="Record a call, message, or next step…" className="w-full rounded-lg border border-slate-300 p-3 text-sm" /><Button className="mt-3 w-full" disabled={saving || !noteBody.trim()} type="submit"><Plus className="mr-2 size-4" />Add note</Button></form></Card>
      <Card title="Linked Quotations" icon={FileText}><div className="mt-4 space-y-3">{quotations.length ? quotations.map(quotation => <div key={quotation.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-3"><Link className="font-semibold text-violet-700 hover:underline" href={`/admin/quotations/${quotation.id}/edit`}>{quotation.quotation_number}</Link><span>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(quotation.total_amount)}</span></div><p className="mt-1 text-xs text-slate-500">{label(quotation.status)} · {dateLabel(quotation.created_at)}</p><a className="mt-2 inline-flex text-xs font-medium text-violet-700 hover:underline" href={`/api/admin/quotations/${quotation.id}/pdf`}><Download className="mr-1 size-3.5" />Download PDF</a></div>) : <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">No quotations are linked to this lead yet.</p>}</div><Button asChild variant="outline" className="mt-4 w-full"><Link href={`/admin/quotations/new?leadId=${lead.id}`}><Plus className="mr-2 size-4" />Create quotation</Link></Button></Card>
    </aside></div>
  </main>
}
function Card({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Icon className="size-5 text-violet-600" />{title}</h2>{children}</section> }
function Info({ label: fieldLabel, value, icon: Icon }: { label: string; value: string; icon: typeof FileText }) { return <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3"><Icon className="size-5 text-violet-600" /><p className="mt-2 text-xs text-slate-500">{fieldLabel}</p><p className="mt-0.5 font-semibold text-slate-900">{value}</p></div> }
function EditPanel({ lead, saving, onSave }: { lead: Lead; saving: boolean; onSave: (values: Record<string, string | number | null>) => Promise<boolean> }) {
  const [draft, setDraft] = useState({ contactName: lead.contact_name, mobile: lead.mobile || '', email: lead.email || '', requirementSummary: lead.requirement_summary || '', eventType: lead.event_type || '', packageType: lead.package_type || '', eventSession: lead.event_session || '', eventDate: lead.event_date || '', eventEndDate: lead.event_end_date || '', totalMembers: lead.total_members?.toString() || '' })
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSave({ ...draft, eventType: draft.eventType || null, packageType: draft.packageType || null, eventSession: draft.eventSession || null, eventDate: draft.eventDate || null, eventEndDate: draft.eventSession === 'two_sessions' ? draft.eventEndDate || null : null, totalMembers: draft.totalMembers ? Number(draft.totalMembers) : null })
  }
  const inputClass = 'mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3'
  return <Card title="Edit Lead" icon={Edit3}><form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium text-slate-700">Name<input required value={draft.contactName} onChange={event => setDraft({ ...draft, contactName: event.target.value })} className={inputClass} /></label>
    <label className="text-sm font-medium text-slate-700">Mobile<input value={draft.mobile} onChange={event => setDraft({ ...draft, mobile: event.target.value })} className={inputClass} /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Email<input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
    <div className="sm:col-span-2 border-t border-slate-200 pt-4"><p className="font-semibold text-slate-900">Event information</p></div>
    <label className="text-sm font-medium text-slate-700">Event type<select value={draft.eventType} onChange={event => setDraft({ ...draft, eventType: event.target.value })} className={inputClass}><option value="">Not selected</option><option value="60th-marriage">60th Marriage</option><option value="70th-marriage">70th Marriage</option><option value="80th-marriage">80th Marriage</option></select></label>
    <label className="text-sm font-medium text-slate-700">Package type<select value={draft.packageType} onChange={event => setDraft({ ...draft, packageType: event.target.value })} className={inputClass}><option value="">Not selected</option><option value="basic">Standard</option><option value="premium">Premium</option></select></label>
    <label className="text-sm font-medium text-slate-700">Session<select value={draft.eventSession} onChange={event => setDraft({ ...draft, eventSession: event.target.value })} className={inputClass}><option value="">Not selected</option><option value="one_session">1 session</option><option value="two_sessions">2 sessions</option></select></label>
    <label className="text-sm font-medium text-slate-700">Event date<input type="date" value={draft.eventDate} onChange={event => setDraft({ ...draft, eventDate: event.target.value })} className={inputClass} /></label>
    {draft.eventSession === 'two_sessions' && <label className="text-sm font-medium text-slate-700">Second session date<input required type="date" min={draft.eventDate || undefined} value={draft.eventEndDate} onChange={event => setDraft({ ...draft, eventEndDate: event.target.value })} className={inputClass} /></label>}
    <label className="text-sm font-medium text-slate-700">Total members<input type="number" min="1" max="10000" value={draft.totalMembers} onChange={event => setDraft({ ...draft, totalMembers: event.target.value })} className={inputClass} /></label>
    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Requirement<textarea value={draft.requirementSummary} onChange={event => setDraft({ ...draft, requirementSummary: event.target.value })} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-md border border-slate-300 p-3" /></label>
    <div className="sm:col-span-2"><Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save changes'}</Button></div>
  </form></Card>
}
