import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { MarkdownArticle } from '@/components/blog/MarkdownArticle'
import { adminBlogPreviewRobots, getAdminBlogPreview } from '@/lib/blog/admin-blog-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'

export const metadata: Metadata = {
  title: 'Admin Blog Preview',
  robots: adminBlogPreviewRobots,
}

export default async function AdminBlogPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ locale?: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')
  const { id } = await params
  const { locale } = await searchParams

  let preview: Awaited<ReturnType<typeof getAdminBlogPreview>>
  try {
    preview = await getAdminBlogPreview(id, locale)
  } catch {
    notFound()
  }

  const language = preview.locale === 'en' ? 'English' : 'Tamil'
  const status = preview.translationStatus === 'published' ? 'Published' : 'Draft'
  return <div className="min-h-screen bg-stone-50 px-4 py-10"><article className="mx-auto max-w-3xl rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10"><div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Admin Preview</p><p className="mt-1 text-sm text-stone-600">Language: {language} · Status: {status}</p><p className="mt-1 text-xs text-stone-500">Preview shows last saved content. Save changes before previewing.</p></div><Link href={`/admin/blogs/${preview.id}/edit`} className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Edit</Link></div><h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">{preview.title || 'Untitled Draft'}</h1>{preview.excerpt && <p className="mt-4 text-lg leading-8 text-stone-600">{preview.excerpt}</p>}<div className="mt-8 border-t border-stone-200 pt-8"><MarkdownArticle content={preview.content} /></div></article></div>
}
