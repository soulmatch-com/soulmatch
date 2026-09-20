'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type Locale = 'en' | 'ta'
type TranslationStatus = 'draft' | 'published' | 'missing'
type TranslationForm = { title: string; excerpt: string; seoTitle: string; metaDescription: string; content: string; status: TranslationStatus }
type BlogEditorFormProps = {
  mode?: 'create' | 'edit'
  blog?: { id: string; slug: string; featuredImageUrl: string; publishedAt: string | null; english: TranslationForm; tamil: TranslationForm }
}

const emptyTranslation = (): TranslationForm => ({ title: '', excerpt: '', seoTitle: '', metaDescription: '', content: '', status: 'missing' })
const meaningful = (translation: TranslationForm) => Boolean(translation.title.trim() || translation.excerpt.trim() || translation.content.trim() || translation.seoTitle.trim() || translation.metaDescription.trim())

function Field({ id, label, value, onChange, textarea = false, helper, count }: { id: string; label: string; value: string; onChange: (value: string) => void; textarea?: boolean; helper?: string; count?: boolean }) {
  const inputClass = 'mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900'
  return <div>
    <div className="flex items-baseline justify-between gap-3"><label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>{count && <span className="text-xs text-slate-500">{value.length} characters</span>}</div>
    {textarea ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-28`} /> : <input id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />}
    {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
  </div>
}

function TranslationSection({ locale, value, onChange, previewHref }: { locale: Locale; value: TranslationForm; onChange: (next: TranslationForm) => void; previewHref?: string }) {
  const prefix = locale === 'en' ? 'English' : 'Tamil'
  const set = (field: keyof Omit<TranslationForm, 'status'>) => (next: string) => onChange({ ...value, [field]: next })
  const stateLabel = value.status === 'missing' ? 'Not Added' : value.status === 'published' ? 'Published' : 'Draft'
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{prefix}</h2><p className="mt-1 text-sm text-slate-600">{prefix} — {stateLabel}</p></div>{previewHref && value.status !== 'missing' && meaningful(value) ? <Link href={previewHref} className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Preview {prefix}</Link> : <span className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm text-slate-400" aria-disabled="true">Preview {prefix}</span>}</div>
    <div className="mt-5 grid gap-5">
      <Field id={`${locale}-title`} label={`${prefix} Title`} value={value.title} onChange={set('title')} />
      <Field id={`${locale}-excerpt`} label={`${prefix} Excerpt`} value={value.excerpt} onChange={set('excerpt')} textarea />
      <Field id={`${locale}-seo-title`} label={`${prefix} SEO Title`} value={value.seoTitle} onChange={set('seoTitle')} count />
      <Field id={`${locale}-meta-description`} label={`${prefix} Meta Description`} value={value.metaDescription} onChange={set('metaDescription')} textarea count />
      <Field id={`${locale}-content`} label={`${prefix} Content`} value={value.content} onChange={set('content')} textarea helper="Supports Markdown formatting. Save changes before previewing." />
    </div>
  </section>
}

export default function BlogEditorForm({ mode = 'create', blog }: BlogEditorFormProps) {
  const router = useRouter()
  const [slug, setSlug] = useState(blog?.slug ?? '')
  const [featuredImageUrl, setFeaturedImageUrl] = useState(blog?.featuredImageUrl ?? '')
  const [english, setEnglish] = useState(blog?.english ?? emptyTranslation)
  const [tamil, setTamil] = useState(blog?.tamil ?? emptyTranslation)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const slugLocked = Boolean(blog?.publishedAt)
  const isEdit = mode === 'edit' && blog

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const trimmedSlug = slug.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setError('Use lowercase letters, numbers and hyphens only for the slug.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(isEdit ? `/api/admin/blogs/${blog.id}` : '/api/admin/blogs', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: trimmedSlug, featuredImageUrl, translations: [{ locale: 'en', title: english.title, excerpt: english.excerpt, seoTitle: english.seoTitle, metaDescription: english.metaDescription, content: english.content }, { locale: 'ta', title: tamil.title, excerpt: tamil.excerpt, seoTitle: tamil.seoTitle, metaDescription: tamil.metaDescription, content: tamil.content }] }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = data.message === 'Invalid blog details.' ? 'Please check the highlighted fields.' : data.message
        throw new Error(message || 'Unable to save blog. Please try again.')
      }
      if (isEdit) {
        setSuccess('Changes saved successfully.')
        router.refresh()
      } else if (data.blogId) {
        router.push(`/admin/blogs/${data.blogId}/edit?created=1`)
      } else {
        throw new Error('Unable to save blog. Please try again.')
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to save blog. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <form onSubmit={submit} className="space-y-6" noValidate>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">General</h2>
      <div className="mt-5 grid gap-5">
        <div>
          <label htmlFor="slug" className="text-sm font-medium text-slate-700">Slug</label>
          <input id="slug" value={slug} disabled={slugLocked} onChange={(event) => setSlug(event.target.value)} placeholder="sashtiapthapoorthi-in-thirukadaiyur" aria-describedby="slug-help slug-error" className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100" />
          <p id="slug-help" className="mt-1 text-xs text-slate-500">{slugLocked ? 'The slug cannot be changed after publication because it is the public article URL.' : 'This becomes the public article URL after publication.'}</p>
          {error && <p id="slug-error" role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600"><p>Future public URL — English: https://mythirumanam.in/blog/{slug || '{slug}'}</p><p className="mt-1">Future public URL — Tamil: https://mythirumanam.in/ta/blog/{slug || '{slug}'}</p></div>
        </div>
        <div>
          <label htmlFor="featured-image-url" className="text-sm font-medium text-slate-700">Featured Image URL <span className="font-normal text-slate-500">(optional)</span></label>
          <input id="featured-image-url" type="url" value={featuredImageUrl} onChange={(event) => setFeaturedImageUrl(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
      </div>
    </section>
    <TranslationSection locale="en" value={english} onChange={setEnglish} previewHref={isEdit ? `/admin/blogs/${blog.id}/preview?locale=en` : undefined} />
    <TranslationSection locale="ta" value={tamil} onChange={setTamil} previewHref={isEdit ? `/admin/blogs/${blog.id}/preview?locale=ta` : undefined} />
    {success && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Draft'}</button>
      <Link href="/admin/blogs" className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Blog Management</Link>
    </div>
  </form>
}
