'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Check, ClipboardList, FileText, Instagram, Mail, MessageCircle, Phone, Plus, UserRound, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

const sources = ['instagram', 'whatsapp', 'call', 'referral', 'other']
const statuses = ['new', 'contacted', 'follow_up', 'qualified', 'confirmed']
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

export default function NewLeadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [eventSession, setEventSession] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [requirement, setRequirement] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    if (typeof payload.nextFollowUpAt === 'string' && payload.nextFollowUpAt) payload.nextFollowUpAt = new Date(payload.nextFollowUpAt).toISOString()
    try {
      const response = await fetch('/api/admin/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to create lead')
      if (internalNotes.trim()) {
        await fetch(`/api/admin/leads/${result.lead.id}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: internalNotes.trim() }) })
      }
      router.push(`/admin/leads/${result.lead.id}`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create lead') } finally { setSaving(false) }
  }

  const inputClass = 'mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100'
  return <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
    <div className="flex items-center gap-2 text-sm text-slate-500"><Link href="/admin/leads" className="inline-flex items-center gap-1 hover:text-violet-700"><ArrowLeft className="size-4" />Leads</Link><span>/</span><span className="font-medium text-slate-800">Create Lead</span></div>
    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Create Lead</h1>
    <p className="mt-1 text-slate-600">Add a new enquiry and capture event requirements.</p>
    <form onSubmit={submit} className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
      <div className="space-y-5">
        <Panel title="Customer Information" icon={UserRound}>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" required icon={UserRound}><input required name="contactName" maxLength={150} placeholder="Enter customer name" className={inputClass} /></Field>
            <Field label="Mobile Number" required icon={Phone}><input required name="mobile" inputMode="tel" minLength={7} maxLength={30} placeholder="Enter mobile number" className={inputClass} /></Field>
            <Field label="Email" icon={Mail}><input name="email" type="email" maxLength={320} placeholder="Enter email address" className={inputClass} /></Field>
            <Field label="Lead Source" required icon={Instagram}><select required name="source" defaultValue="instagram" className={inputClass}>{sources.map(source => <option key={source} value={source}>{label(source)}</option>)}</select></Field>
          </div>
        </Panel>
        <Panel title="Event Requirements" icon={CalendarDays}>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Event Type" required icon={UsersRound}><select required name="eventType" defaultValue="" className={inputClass}><option value="" disabled>Select event type</option><option value="60th-marriage">60th Marriage</option><option value="70th-marriage">70th Marriage</option><option value="80th-marriage">80th Marriage</option></select></Field>
            <Field label="Package Type" icon={FileText}><select name="packageType" defaultValue="" className={inputClass}><option value="">Select package type</option><option value="basic">Standard</option><option value="premium">Premium</option></select></Field>
            <Field label="Session" icon={CalendarDays}><select name="eventSession" value={eventSession} onChange={event => setEventSession(event.target.value)} className={inputClass}><option value="">Select session</option><option value="one_session">1 session</option><option value="two_sessions">2 sessions</option></select></Field>
            <Field label="Event Date" required icon={CalendarDays}><input required name="eventDate" type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} className={inputClass} /></Field>
            {eventSession === 'two_sessions' && <Field label="Second Session Date" required icon={CalendarDays}><input required name="eventEndDate" type="date" min={eventDate || undefined} className={inputClass} /></Field>}
            <Field label="Total Members" icon={UsersRound}><input name="totalMembers" type="number" min="1" max="10000" inputMode="numeric" placeholder="Enter number of members" className={inputClass} /></Field>
          </div>
        </Panel>
        <Panel title="Lead Management" icon={ClipboardList}>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Lead Status" required icon={Check}><select required name="status" defaultValue="new" className={inputClass}>{statuses.map(status => <option key={status} value={status}>{label(status)}</option>)}</select></Field>
            <Field label="Preferred Contact" icon={MessageCircle}><select aria-label="Preferred contact method" className={inputClass} disabled><option>Select contact method</option></select><p className="mt-1 text-xs text-slate-500">Captured from celebration enquiries when available.</p></Field>
            <Field label="Next Follow-up Date & Time" icon={CalendarDays}><input name="nextFollowUpAt" type="datetime-local" className={inputClass} /></Field>
          </div>
        </Panel>
      </div>
      <aside className="space-y-5">
        <Panel title="Enquiry Details" icon={FileText} accent>
          <Field label="Customer Requirement / First Message"><textarea name="requirementSummary" value={requirement} onChange={event => setRequirement(event.target.value)} maxLength={2000} rows={5} placeholder="Enter the customer's original enquiry, event requirements and special requests…" className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></Field>
          <p className="mt-1 text-right text-xs text-slate-500">{requirement.length} / 2000</p>
          <div className="mt-5"><Field label="Internal Notes (Admin Only)"><textarea value={internalNotes} onChange={event => setInternalNotes(event.target.value)} maxLength={2000} rows={4} placeholder="Add internal observations, reminders or follow-up instructions…" className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></Field><p className="mt-1 text-right text-xs text-slate-500">{internalNotes.length} / 2000</p></div>
        </Panel>
        <section className="rounded-2xl border border-violet-100 bg-violet-50 p-5"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Check className="size-5 text-violet-600" />Tips</h2><ul className="mt-4 space-y-3 text-sm text-slate-700"><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-violet-600" />Fill in fields marked with an asterisk.</li><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-violet-600" />Use a clear, short customer requirement.</li><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-violet-600" />Set a follow-up to stay on track.</li></ul></section>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        <div className="flex justify-end gap-3 pt-3"><Button type="button" variant="outline" asChild><Link href="/admin/leads">Cancel</Link></Button><Button disabled={saving} type="submit"><Plus className="mr-2 size-4" />{saving ? 'Creating…' : 'Create Lead'}</Button></div>
      </aside>
    </form>
  </main>
}

function Panel({ title, icon: Icon, accent, children }: { title: string; icon: typeof FileText; accent?: boolean; children: React.ReactNode }) { return <section className={`rounded-2xl border p-5 shadow-sm ${accent ? 'border-violet-100 bg-violet-50/60' : 'border-slate-200 bg-white'}`}><h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Icon className="size-5 text-violet-600" />{title}</h2>{children}</section> }
function Field({ label, required, icon: Icon, children }: { label: string; required?: boolean; icon?: typeof FileText; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-800"><span className="flex items-center gap-1.5">{Icon && <Icon className="size-4 text-violet-600" />}{label}{required && <span className="text-rose-600">*</span>}</span>{children}</label> }
