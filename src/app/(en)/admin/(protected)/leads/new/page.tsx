'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const sources = ['instagram', 'whatsapp', 'call', 'referral', 'other']
const label = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function NewLeadPage() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError('')
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    if (typeof payload.nextFollowUpAt === 'string' && payload.nextFollowUpAt) payload.nextFollowUpAt = new Date(payload.nextFollowUpAt).toISOString()
    try {
      const response = await fetch('/api/admin/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to create lead')
      router.push(`/admin/leads/${result.lead.id}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create lead') } finally { setSaving(false) }
  }
  return <div className="container mx-auto max-w-2xl px-4 py-10"><Link href="/admin/leads" className="inline-flex items-center text-sm font-medium text-slate-700"><ArrowLeft className="mr-1 h-4 w-4" />Back to leads</Link><h1 className="mt-5 text-3xl font-bold text-slate-900">Add a lead</h1><p className="mt-2 text-slate-600">Enter enquiries received through Instagram, WhatsApp, phone, referrals, or another channel.</p><form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border bg-white p-6"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Source<select name="source" defaultValue="instagram" className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">{sources.map((source) => <option key={source} value={source}>{label(source)}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Name *<input required name="contactName" maxLength={150} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Mobile<input name="mobile" inputMode="tel" maxLength={30} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label><label className="text-sm font-medium text-slate-700">Email<input name="email" type="email" maxLength={320} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Event type<select name="eventType" defaultValue="" className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Select event type</option><option value="60th-marriage">60th Marriage</option><option value="70th-marriage">70th Marriage</option><option value="80th-marriage">80th Marriage</option></select></label><label className="block text-sm font-medium text-slate-700">Session<select name="eventSession" defaultValue="" className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Select session</option><option value="one_session">1 session</option><option value="two_sessions">2 sessions</option></select></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Event date<input name="eventDate" type="date" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label><label className="block text-sm font-medium text-slate-700">Total members<input name="totalMembers" type="number" min="1" max="10000" inputMode="numeric" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label></div><label className="block text-sm font-medium text-slate-700">Next follow-up<input name="nextFollowUpAt" type="datetime-local" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" /></label><label className="block text-sm font-medium text-slate-700">Requirement / first message<textarea name="requirementSummary" maxLength={2000} rows={5} className="mt-2 w-full rounded-md border border-slate-300 p-3 text-sm" /></label>{error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" asChild><Link href="/admin/leads">Cancel</Link></Button><Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Create lead'}</Button></div></form></div>
}
