'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Locale = 'en' | 'ta'
type LocaleState = { exists: boolean; status: 'draft' | 'published' | 'missing' }

type BlogPublicationControlsProps = {
  blogId: string
  postStatus: 'draft' | 'published'
  publishedAt: string | null
  english: LocaleState
  tamil: LocaleState
}

function localeName(locale: Locale) { return locale === 'en' ? 'English' : 'Tamil' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export default function BlogPublicationControls({ blogId, postStatus, publishedAt, english, tamil }: BlogPublicationControlsProps) {
  const router = useRouter()
  const [loadingLocale, setLoadingLocale] = useState<Locale | null>(null)
  const [confirmLocale, setConfirmLocale] = useState<Locale | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function changePublication(locale: Locale, action: 'publish' | 'unpublish') {
    if (loadingLocale) return
    setLoadingLocale(locale)
    setFeedback(null)
    try {
      const response = await fetch(`/api/admin/blogs/${blogId}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data.message === 'This translation is not ready to publish.') throw new Error(`${localeName(locale)} article is not ready to publish. Please complete the required fields and save your changes first.`)
        throw new Error(data.message || `Unable to ${action} blog.`)
      }
      setFeedback({ type: 'success', message: `${localeName(locale)} article ${action === 'publish' ? 'published' : 'unpublished'} successfully.` })
      router.refresh()
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' })
    } finally {
      setLoadingLocale(null)
      setConfirmLocale(null)
    }
  }

  function localeRow(locale: Locale, state: LocaleState) {
    const name = localeName(locale)
    const isLoading = loadingLocale === locale
    if (!state.exists || state.status === 'missing') return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-medium text-slate-900">{name}</p><p className="text-sm text-slate-600">Not Added</p></div><span className="text-sm text-slate-500">Add and save this translation before publishing.</span></div>
    const published = state.status === 'published'
    return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-medium text-slate-900">{name}</p><p className="text-sm text-slate-600">{published ? 'Published' : 'Draft'}</p></div>{published ? <button type="button" disabled={isLoading} onClick={() => setConfirmLocale(locale)} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{isLoading ? 'Unpublishing...' : `Unpublish ${name}`}</button> : <button type="button" disabled={isLoading} onClick={() => changePublication(locale, 'publish')} className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{isLoading ? 'Publishing...' : `Publish ${name}`}</button>}</div>
  }

  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="publication-heading">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="publication-heading" className="text-lg font-semibold text-slate-900">Publication</h2><p className="mt-1 text-sm text-slate-600">Save your latest changes before publishing.</p></div><div className="text-right"><p className="text-sm font-medium text-slate-900">Post status: {postStatus === 'published' ? 'Published' : 'Draft'}</p>{publishedAt && <p className="mt-1 text-xs text-slate-600">First Published: {formatDate(publishedAt)}</p>}</div></div>
    <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">CMS publication status is being prepared for the new dynamic blog system. The current public blog remains code-backed until the public integration phase is completed.</p>
    <div className="mt-4 grid gap-3">{localeRow('en', english)}{localeRow('ta', tamil)}</div>
    {feedback && <p role={feedback.type === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-md p-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{feedback.message}</p>}
    <Dialog open={confirmLocale !== null} onOpenChange={(open) => !open && setConfirmLocale(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>Unpublish {confirmLocale ? localeName(confirmLocale) : ''} article?</DialogTitle><DialogDescription>This will remove the {confirmLocale ? localeName(confirmLocale) : ''} version from public availability once the CMS public-blog integration is enabled. The content will remain saved.</DialogDescription></DialogHeader>
        <DialogFooter><button type="button" onClick={() => setConfirmLocale(null)} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={!confirmLocale || loadingLocale !== null} onClick={() => confirmLocale && changePublication(confirmLocale, 'unpublish')} className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{loadingLocale ? 'Unpublishing...' : 'Unpublish'}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}
