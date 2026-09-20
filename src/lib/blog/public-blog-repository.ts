import 'server-only'

import { z } from 'zod'

import type { CmsBlogLocale } from '@/lib/blog/cms-types'
import { createAdminClient } from '@/lib/supabase/admin'
import { blogLocaleSchema, blogSlugSchema } from '@/lib/validations/blog-cms.schema'
import type { PublicBlogArticle, PublicBlogListItem, PublicBlogLocaleAvailability, PublicBlogSitemapEntry } from '@/lib/blog/public-blog-types'

type PublicPostRow = { slug: string; status: 'draft' | 'published'; featured_image_url: string | null; featured_image_alt: string | null; published_at: string | null; updated_at: string }
type PublicTranslationRow = { locale: CmsBlogLocale; status: 'draft' | 'published'; title: string; excerpt: string; content?: string; seo_title?: string | null; meta_description?: string | null; updated_at: string; blog_posts: PublicPostRow | null }

const publicListOptionsSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) })

export class PublicBlogRepositoryError extends Error {
  constructor(message = 'Unable to load blog content.') { super(message) }
}

function toListItem(row: PublicTranslationRow): PublicBlogListItem | null {
  const post = row.blog_posts
  if (!post || post.status !== 'published' || row.status !== 'published' || !post.published_at) return null
  return { slug: post.slug, title: row.title, excerpt: row.excerpt, publishedAt: post.published_at, updatedAt: row.updated_at, featuredImageUrl: post.featured_image_url, featuredImageAlt: post.featured_image_alt, locale: row.locale }
}

function publicReadError(error: unknown): never {
  void error
  console.error('Public blog CMS read failed')
  throw new PublicBlogRepositoryError()
}

export async function getPublishedBlogPosts(localeInput: unknown, options: unknown = {}) {
  const locale = blogLocaleSchema.safeParse(localeInput)
  if (!locale.success) return { items: [] as PublicBlogListItem[], page: 1, pageSize: 20, total: 0 }
  const { page, pageSize } = publicListOptionsSchema.parse(options)
  const db = createAdminClient()
  const { data, error, count } = await db.from('blog_post_translations').select('locale, status, title, excerpt, updated_at, blog_posts!inner(slug, status, featured_image_url, featured_image_alt, published_at, updated_at)', { count: 'exact' }).eq('locale', locale.data).eq('status', 'published').eq('blog_posts.status', 'published').order('published_at', { ascending: false, foreignTable: 'blog_posts' }).range((page - 1) * pageSize, page * pageSize - 1)
  if (error) publicReadError(error)
  const items = ((data ?? []) as unknown as PublicTranslationRow[]).map(toListItem).filter((item): item is PublicBlogListItem => item !== null)
  return { items, page, pageSize, total: count ?? 0 }
}

export async function getPublishedBlogBySlug(slugInput: unknown, localeInput: unknown): Promise<PublicBlogArticle | null> {
  const slug = blogSlugSchema.safeParse(slugInput)
  const locale = blogLocaleSchema.safeParse(localeInput)
  if (!slug.success || !locale.success) return null
  const db = createAdminClient()
  const { data, error } = await db.from('blog_post_translations').select('locale, status, title, excerpt, content, seo_title, meta_description, updated_at, blog_posts!inner(slug, status, featured_image_url, featured_image_alt, published_at, updated_at)').eq('locale', locale.data).eq('status', 'published').eq('blog_posts.slug', slug.data).eq('blog_posts.status', 'published').maybeSingle()
  if (error) publicReadError(error)
  if (!data) return null
  const row = data as unknown as PublicTranslationRow
  const listItem = toListItem(row)
  if (!listItem || !row.content) return null
  return { ...listItem, content: row.content, seoTitle: row.seo_title ?? null, metaDescription: row.meta_description ?? null }
}

export async function getPublishedBlogLocales(slugInput: unknown): Promise<PublicBlogLocaleAvailability> {
  const slug = blogSlugSchema.safeParse(slugInput)
  if (!slug.success) return { en: false, ta: false }
  const db = createAdminClient()
  const { data, error } = await db.from('blog_post_translations').select('locale, status, blog_posts!inner(slug, status)').eq('status', 'published').eq('blog_posts.status', 'published').eq('blog_posts.slug', slug.data)
  if (error) publicReadError(error)
  const locales = new Set(((data ?? []) as unknown as Array<Pick<PublicTranslationRow, 'locale'>>).map((item) => item.locale))
  return { en: locales.has('en'), ta: locales.has('ta') }
}

export async function getPublishedBlogEntriesForSitemap(): Promise<PublicBlogSitemapEntry[]> {
  const db = createAdminClient()
  const { data, error } = await db.from('blog_post_translations').select('locale, status, updated_at, blog_posts!inner(slug, status)').eq('status', 'published').eq('blog_posts.status', 'published')
  if (error) publicReadError(error)
  return ((data ?? []) as unknown as PublicTranslationRow[]).flatMap((row) => row.blog_posts && row.status === 'published' && row.blog_posts.status === 'published' ? [{ slug: row.blog_posts.slug, locale: row.locale, updatedAt: row.updated_at }] : [])
}
