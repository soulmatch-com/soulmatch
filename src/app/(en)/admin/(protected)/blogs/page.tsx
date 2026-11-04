import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'

import { getAdminBlogPosts } from '@/lib/blog/admin-blog-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'
import BlogListActions from '@/components/admin/BlogListActions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valueOf(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  const style = status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{status === 'published' ? 'Published' : 'Draft'}</span>
}

function LocaleBadge({ label, status }: { label: 'EN' | 'TA'; status: 'draft' | 'published' | 'missing' }) {
  if (status === 'missing') return null
  const style = status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
  return <span className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${style}`}>{label} {status === 'published' ? 'Published' : 'Draft'}</span>
}

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages] as const
  if (currentPage >= totalPages - 3) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const
  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages] as const
}

export default async function AdminBlogsPage({ searchParams }: { searchParams: SearchParams }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) redirect('/admin/login')

  const params = await searchParams
  const requestedStatus = valueOf(params.status)
  const status = requestedStatus === 'draft' || requestedStatus === 'published' ? requestedStatus : 'all'
  const search = valueOf(params.search)
  const requestedPage = Number(valueOf(params.page))
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  let result: Awaited<ReturnType<typeof getAdminBlogPosts>> | null = null
  let loadFailed = false
  try {
    result = await getAdminBlogPosts({ page, pageSize: 20, status, search })
  } catch {
    loadFailed = true
  }

  const makeHref = (targetPage: number) => {
    const query = new URLSearchParams()
    if (search) query.set('search', search)
    if (status !== 'all') query.set('status', status)
    if (targetPage > 1) query.set('page', String(targetPage))
    const text = query.toString()
    return text ? `/admin/blogs?${text}` : '/admin/blogs'
  }
  const hasActiveFilters = Boolean(search || status !== 'all')
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1
  const pages = paginationItems(result?.page ?? page, totalPages)

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex justify-end">
          <Link href="/admin/blogs/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            Add Blog
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <form className="mb-6 flex flex-col gap-3 md:flex-row md:items-end" action="/admin/blogs" method="get">
            <div className="w-full md:max-w-md">
              <label htmlFor="blog-search" className="mb-1.5 block text-sm font-medium text-slate-700">Search by title or slug</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="blog-search" name="search" defaultValue={search} className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Search by title or slug" />
              </div>
            </div>
            <div className="w-full md:w-44">
              <label htmlFor="blog-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
              <select id="blog-status" name="status" defaultValue={status} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <button type="submit" className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">Apply filters</button>
            {hasActiveFilters && <Link href="/admin/blogs" className="h-10 rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Clear filters</Link>}
          </form>

          {loadFailed ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Unable to load blogs. Please try again after the Blog CMS database migration is available.</div>
          ) : result && result.rows.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{hasActiveFilters ? 'No blogs match your filters.' : 'No blog posts yet.'}</h2>
              <p className="mt-2 text-sm text-slate-600">{hasActiveFilters ? 'Try clearing your search or status filter.' : 'Create your first English or Tamil article for MyThirumanam.'}</p>
              <div className="mt-5">
                {hasActiveFilters ? <Link href="/admin/blogs" className="text-sm font-medium text-slate-900 underline">Clear filters</Link> : <Link href="/admin/blogs/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"><Plus className="h-4 w-4" />Add Blog</Link>}
              </div>
            </div>
          ) : result ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-3 font-medium">Title</th><th className="px-3 py-3 font-medium">Slug</th><th className="px-3 py-3 font-medium">Languages</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Published</th><th className="px-3 py-3 font-medium">Updated</th><th className="px-3 py-3 font-medium">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {result.rows.map((blog) => (
                      <tr key={blog.id}>
                        <td className="max-w-xs px-3 py-4 font-medium text-slate-900">{blog.english.title || blog.tamil.title || 'Untitled Draft'}</td>
                        <td className="px-3 py-4 font-mono text-xs text-slate-600">{blog.slug}</td>
                        <td className="px-3 py-4"><div className="flex min-w-40 flex-wrap gap-1.5"><LocaleBadge label="EN" status={blog.english.status} /><LocaleBadge label="TA" status={blog.tamil.status} />{blog.english.status === 'missing' && blog.tamil.status === 'missing' ? '—' : null}</div></td>
                        <td className="px-3 py-4"><StatusBadge status={blog.status} /></td>
                        <td className="whitespace-nowrap px-3 py-4">{formatDate(blog.published_at)}</td>
                        <td className="whitespace-nowrap px-3 py-4">{formatDate(blog.updated_at)}</td>
                        <td className="px-3 py-4"><BlogListActions blogId={blog.id} englishStatus={blog.english.status} tamilStatus={blog.tamil.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav aria-label="Blog list pagination" className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">{result.total} {result.total === 1 ? 'blog' : 'blogs'} · Page {result.page} of {totalPages}</p><div className="flex items-center gap-1"><Link aria-disabled={result.page <= 1} className={`inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium ${result.page <= 1 ? 'pointer-events-none text-slate-400' : 'text-slate-800 hover:bg-slate-100'}`} href={makeHref(Math.max(1, result.page - 1))}><ChevronLeft className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Previous</span></Link>{pages.map((item, index) => typeof item === 'number' ? <Link key={item} aria-current={item === result.page ? 'page' : undefined} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium ${item === result.page ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`} href={makeHref(item)}>{item}</Link> : <span key={`${item}-${index}`} className="inline-flex h-9 min-w-5 items-center justify-center text-sm text-slate-500" aria-hidden="true">…</span>)}<Link aria-disabled={result.page >= totalPages} className={`inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium ${result.page >= totalPages ? 'pointer-events-none text-slate-400' : 'text-slate-800 hover:bg-slate-100'}`} href={makeHref(Math.min(totalPages, result.page + 1))}><span className="sr-only sm:not-sr-only">Next</span><ChevronRight className="h-4 w-4" /></Link></div></nav>
            </>
          ) : null}
        </section>
      </div>
    </div>
  )
}
