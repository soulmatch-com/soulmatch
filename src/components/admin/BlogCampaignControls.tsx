'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Locale = 'en' | 'ta'
type TranslationState = { exists: boolean; status: 'draft' | 'published' | 'missing' }
type CampaignState = { id: string; status: 'draft' | 'queued' | 'processing' | 'completed' | 'partially_failed' | 'failed' | 'cancelled'; createdAt: string } | null

type Props = {
  blogId: string
  english: TranslationState
  tamil: TranslationState
  englishCampaign: CampaignState
  tamilCampaign: CampaignState
  available?: boolean
}

const localeName = (locale: Locale) => locale === 'en' ? 'English' : 'Tamil'
const statusLabel = (status: NonNullable<CampaignState>['status']) => status === 'draft' ? 'Draft' : status.replace('_', ' ')

export default function BlogCampaignControls({ blogId, english, tamil, englishCampaign, tamilCampaign, available = true }: Props) {
  const router = useRouter()
  const [loadingLocale, setLoadingLocale] = useState<Locale | null>(null)
  const [campaigns, setCampaigns] = useState<Record<Locale, CampaignState>>({ en: englishCampaign, ta: tamilCampaign })
  const [feedback, setFeedback] = useState<string | null>(null)

  async function createDraft(locale: Locale) {
    if (loadingLocale) return
    setLoadingLocale(locale)
    setFeedback(null)
    try {
      const response = await fetch(`/api/admin/blogs/${blogId}/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok || !result || typeof result !== 'object' || !('campaignId' in result) || typeof result.campaignId !== 'string') throw new Error('Unable to create campaign draft.')
      setCampaigns((current) => ({ ...current, [locale]: { id: result.campaignId, status: 'draft', createdAt: new Date().toISOString() } }))
      setFeedback('Campaign draft created. Review the stored snapshot before sending is enabled.')
      router.refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to create campaign draft.')
    } finally {
      setLoadingLocale(null)
    }
  }

  function row(locale: Locale, translation: TranslationState) {
    const campaign = campaigns[locale]
    const loading = loadingLocale === locale
    if (!available) {
      return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="font-medium text-slate-900">{localeName(locale)}</p><p className="mt-1 text-sm text-amber-900">Email Campaign storage is not configured in this environment yet.</p></div>
    }
    if (!translation.exists || translation.status === 'missing') {
      return <div className="rounded-lg border border-slate-200 p-4"><p className="font-medium text-slate-900">{localeName(locale)}</p><p className="mt-1 text-sm text-slate-600">Email Campaign unavailable until this translation is added.</p></div>
    }
    if (translation.status !== 'published') {
      return <div className="rounded-lg border border-slate-200 p-4"><p className="font-medium text-slate-900">{localeName(locale)}</p><p className="mt-1 text-sm text-slate-600">Email Campaign unavailable until this translation is published.</p></div>
    }
    if (campaign) {
      return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><div><p className="font-medium text-slate-900">{localeName(locale)}</p><p className="mt-1 text-sm text-emerald-800">Email Campaign · Status: {statusLabel(campaign.status)}</p></div><Link href={`/admin/blogs/${blogId}/campaign/${campaign.id}/preview`} className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Preview Campaign</Link></div>
    }
    return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-medium text-slate-900">{localeName(locale)}</p><p className="mt-1 text-sm text-slate-600">Email Campaign · Status: Not Created</p></div><button type="button" disabled={loading} onClick={() => createDraft(locale)} className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? 'Creating Draft...' : 'Create Campaign Draft'}</button></div>
  }

  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="campaign-heading">
    <h2 id="campaign-heading" className="text-lg font-semibold text-slate-900">Email Campaigns</h2>
    <p className="mt-1 text-sm text-slate-600">Campaign drafts capture a snapshot for later sending. Recipients will be determined when the campaign is queued.</p>
    <div className="mt-4 grid gap-3">{row('en', english)}{row('ta', tamil)}</div>
    <p className="mt-4 text-sm text-slate-600">{available ? 'Campaign sending is not enabled yet.' : 'Apply the notification migrations before creating or previewing campaign drafts.'}</p>
    {feedback ? <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{feedback}</p> : null}
  </section>
}
