import { notFound, redirect } from 'next/navigation'

import BlogEditorForm from '@/components/admin/BlogEditorForm'
import BlogPublicationControls from '@/components/admin/BlogPublicationControls'
import { getAdminBlogById } from '@/lib/blog/admin-blog-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'

function translationForm(translation: Awaited<ReturnType<typeof getAdminBlogById>>['english']) {
  if (!translation) return { title: '', excerpt: '', seoTitle: '', metaDescription: '', content: '', status: 'missing' as const }
  return { title: translation.title, excerpt: translation.excerpt, seoTitle: translation.seo_title ?? '', metaDescription: translation.meta_description ?? '', content: translation.content, status: translation.status }
}

export default async function EditAdminBlogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')
  const { id } = await params
  const { created } = await searchParams
  let blog: Awaited<ReturnType<typeof getAdminBlogById>>
  try {
    blog = await getAdminBlogById(id)
  } catch {
    notFound()
  }

  return <div className="container mx-auto px-4 py-10"><div className="mx-auto max-w-4xl"><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Edit Blog</h1><p className="mt-2 font-mono text-sm text-slate-600">{blog.post.slug}</p></div><span className={`rounded-full px-3 py-1 text-sm font-medium ${blog.post.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{blog.post.status === 'published' ? 'Published' : 'Draft'}</span></div>{created === '1' && <p className="mb-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Draft created successfully.</p>}<BlogPublicationControls blogId={blog.post.id} postStatus={blog.post.status} publishedAt={blog.post.published_at} english={{ exists: Boolean(blog.english), status: blog.english?.status ?? 'missing' }} tamil={{ exists: Boolean(blog.tamil), status: blog.tamil?.status ?? 'missing' }} /><BlogEditorForm key={blog.post.updated_at} mode="edit" blog={{ id: blog.post.id, slug: blog.post.slug, featuredImageUrl: blog.post.featured_image_url ?? '', publishedAt: blog.post.published_at, english: translationForm(blog.english), tamil: translationForm(blog.tamil) }} /></div></div>
}
