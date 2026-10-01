'use client'

import Link from 'next/link'
import { Ellipsis, Loader2, Mail, Pencil, Upload } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type Locale = 'en' | 'ta'
type TranslationStatus = 'draft' | 'published' | 'missing'

type Props = {
  blogId: string
  englishStatus: TranslationStatus
  tamilStatus: TranslationStatus
}

const localeName = (locale: Locale) => locale === 'en' ? 'English' : 'Tamil'

export default function BlogListActions({ blogId, englishStatus, tamilStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<`${'publish' | 'campaign'}-${Locale}` | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [campaignLocale, setCampaignLocale] = useState<Locale | null>(null)
  const translations: Record<Locale, TranslationStatus> = { en: englishStatus, ta: tamilStatus }

  async function publish(locale: Locale) {
    const action = `publish-${locale}` as const
    if (loading) return
    setLoading(action)
    setFeedback(null)
    try {
      const response = await fetch(`/api/admin/blogs/${blogId}/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || `Unable to publish ${localeName(locale)} article.`)
      setFeedback(`${localeName(locale)} article published.`)
      router.refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to publish article.')
    } finally {
      setLoading(null)
    }
  }

  async function queueCampaign(locale: Locale) {
    const action = `campaign-${locale}` as const
    if (loading) return
    setLoading(action)
    setFeedback(null)
    try {
      const response = await fetch(`/api/admin/blogs/${blogId}/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }),
      })
      const result: unknown = await response.json().catch(() => null)
      if (!response.ok || !result || typeof result !== 'object' || !('campaignId' in result) || typeof result.campaignId !== 'string') throw new Error('Unable to create email campaign draft.')

      const queueResponse = await fetch(`/api/admin/blogs/${blogId}/campaign/${result.campaignId}/queue`, { method: 'POST' })
      const queueResult: unknown = await queueResponse.json().catch(() => null)
      if (!queueResult || typeof queueResult !== 'object' || !('status' in queueResult) || typeof queueResult.status !== 'string') throw new Error('Unable to queue email campaign.')
      if (queueResult.status === 'no_recipients') throw new Error('No eligible subscribers are currently available for this campaign.')
      if (!queueResponse.ok || !['queued', 'already_queued'].includes(queueResult.status)) throw new Error('Unable to queue email campaign.')

      setFeedback(`${localeName(locale)} email campaign queued for delivery.`)
      setCampaignLocale(null)
      router.refresh()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to queue email campaign.')
    } finally {
      setLoading(null)
    }
  }

  const actions = (['en', 'ta'] as const).map((locale) => {
    const status = translations[locale]
    if (status === 'missing') return null
    const publishing = loading === `publish-${locale}`
    const creatingCampaign = loading === `campaign-${locale}`
    const label = status === 'draft' ? `Publish ${localeName(locale)}` : `Email Campaign (${localeName(locale)})`
    return status === 'draft'
      ? <DropdownMenuItem key={locale} disabled={loading !== null} onSelect={() => publish(locale)}>{publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}{label}</DropdownMenuItem>
      : <DropdownMenuItem key={locale} disabled={loading !== null} onSelect={() => setCampaignLocale(locale)}>{creatingCampaign ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}{locale === 'en' ? 'ENG' : 'TAM'} <span className="ml-2 text-slate-500">Email Campaign</span></DropdownMenuItem>
  })

  return <div className="flex flex-col items-start gap-1">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="More blog actions" title="More actions" className="inline-flex size-8 items-center justify-center rounded border border-slate-300 text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"><Ellipsis className="size-4" /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem asChild><Link href={`/admin/blogs/${blogId}/edit`}><Pencil className="mr-2 size-4" />Edit blog</Link></DropdownMenuItem>
        {actions.some(Boolean) ? <DropdownMenuSeparator /> : null}
        {actions}
      </DropdownMenuContent>
    </DropdownMenu>
    {feedback ? <p role="status" className="max-w-52 text-xs text-slate-600">{feedback}</p> : null}
    <Dialog open={campaignLocale !== null} onOpenChange={(open) => { if (!open && !loading) setCampaignLocale(null) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Queue email campaign</DialogTitle>
          <DialogDescription>Queue a {campaignLocale ? localeName(campaignLocale) : ''} email campaign for this published blog article.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">A saved campaign snapshot will be created and queued for delivery.</p>
          <p className="mt-1">Eligible subscribers are selected now. The campaign will be processed by the delivery worker.</p>
        </div>
        <DialogFooter>
          <button type="button" disabled={loading !== null} onClick={() => setCampaignLocale(null)} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          <button type="button" disabled={campaignLocale === null || loading !== null} onClick={() => campaignLocale && queueCampaign(campaignLocale)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            {loading ? 'Queueing…' : 'Queue campaign'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
