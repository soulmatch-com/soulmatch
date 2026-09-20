import 'server-only'

import { requireActiveAdmin } from '@/lib/admin-auth'
import { revalidatePublishedCmsBlog } from '@/lib/blog/public-blog-revalidation'
import { createAdminClient } from '@/lib/supabase/admin'
import { blogAdminListSchema, blogDraftSchema, blogLocaleSchema, blogPublishSchema } from '@/lib/validations/blog-cms.schema'
import type { CmsBlogInput, CmsBlogLocale, CmsBlogPost, CmsBlogStatus, CmsBlogTranslation } from '@/lib/blog/cms-types'

type TranslationSummary = { exists: boolean; status: CmsBlogStatus | 'missing'; title: string | null }
type CmsRows = { post: CmsBlogPost; translations: CmsBlogTranslation[] }
export const adminBlogPreviewRobots = { index: false, follow: false } as const

export class AdminBlogRepositoryError extends Error {
  constructor(public readonly code: 'BLOG_NOT_FOUND' | 'TRANSLATION_NOT_FOUND' | 'DUPLICATE_SLUG' | 'PUBLISHED_SLUG_LOCKED' | 'NOT_READY_TO_PUBLISH' | 'PUBLISH_FAILED' | 'UNPUBLISH_FAILED' | 'SAVE_FAILED' | 'READ_FAILED', message: string) { super(message) }
}

async function authorize() {
  const result = await requireActiveAdmin()
  if ('response' in result) throw new AdminBlogRepositoryError('READ_FAILED', 'Unauthorized admin request.')
  return result.admin
}

function translationSummary(translations: CmsBlogTranslation[], locale: CmsBlogLocale): TranslationSummary {
  const value = translations.find((translation) => translation.locale === locale)
  return value ? { exists: true, status: value.status, title: value.title } : { exists: false, status: 'missing', title: null }
}

async function getPostRows(id: string): Promise<CmsRows | null> {
  const db = createAdminClient()
  // CMS tables use the narrow local row contracts until generated types are refreshed.
  const { data: post, error } = await db.from('blog_posts').select('id, slug, status, featured_image_url, featured_image_alt, published_at, created_at, updated_at, created_by, updated_by').eq('id', id).maybeSingle()
  if (error) throw new AdminBlogRepositoryError('READ_FAILED', 'Unable to load blog.')
  if (!post) return null
  const { data: translations, error: translationError } = await db.from('blog_post_translations').select('id, post_id, locale, status, title, excerpt, content, seo_title, meta_description, published_at, created_at, updated_at').eq('post_id', id)
  if (translationError) throw new AdminBlogRepositoryError('READ_FAILED', 'Unable to load blog.')
  return { post: post as CmsBlogPost, translations: (translations ?? []) as CmsBlogTranslation[] }
}

export async function getAdminBlogPosts(input: unknown = {}) {
  await authorize()
  const { page, pageSize, status, search } = blogAdminListSchema.parse(input)
  const db = createAdminClient()
  let query = db.from('blog_posts').select('id, slug, status, featured_image_url, featured_image_alt, published_at, created_at, updated_at, created_by, updated_by, blog_post_translations(id, locale, status, title)', { count: 'exact' }).order('updated_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
  if (status !== 'all') query = query.eq('status', status)
  const safeSearch = search.replace(/[^a-zA-Z0-9\u0B80-\u0BFF\s-]/g, '').trim()
  if (safeSearch) query = query.or(`slug.ilike.%${safeSearch}%,blog_post_translations.title.ilike.%${safeSearch}%`)
  const { data, error, count } = await query
  if (error) throw new AdminBlogRepositoryError('READ_FAILED', 'Unable to load blogs.')
  const rows = ((data ?? []) as Array<CmsBlogPost & { blog_post_translations: CmsBlogTranslation[] }>).map(({ blog_post_translations, ...post }) => ({ ...post, english: translationSummary(blog_post_translations, 'en'), tamil: translationSummary(blog_post_translations, 'ta') }))
  return { rows, total: count ?? 0, page, pageSize }
}

export async function getAdminBlogById(id: string) {
  await authorize()
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AdminBlogRepositoryError('BLOG_NOT_FOUND', 'Blog not found.')
  const result = await getPostRows(id)
  if (!result) throw new AdminBlogRepositoryError('BLOG_NOT_FOUND', 'Blog not found.')
  return { post: result.post, english: result.translations.find((item) => item.locale === 'en') ?? null, tamil: result.translations.find((item) => item.locale === 'ta') ?? null }
}

export async function getAdminBlogPreview(id: string, localeInput: unknown) {
  const locale = blogLocaleSchema.parse(localeInput)
  const blog = await getAdminBlogById(id)
  const translation = locale === 'en' ? blog.english : blog.tamil
  if (!translation) throw new AdminBlogRepositoryError('TRANSLATION_NOT_FOUND', 'Blog translation not found.')
  return { id: blog.post.id, slug: blog.post.slug, postStatus: blog.post.status, locale, translationStatus: translation.status, title: translation.title, excerpt: translation.excerpt, content: translation.content, seoTitle: translation.seo_title, metaDescription: translation.meta_description, publishedAt: blog.post.published_at, updatedAt: translation.updated_at }
}

function supplied(value: CmsBlogInput['translations'][number]) {
  return Boolean(value.title?.trim() || value.excerpt?.trim() || value.content?.trim() || value.seoTitle?.trim() || value.metaDescription?.trim())
}

function saveError(error: { code?: string } | null) {
  if (error?.code === '23505') return new AdminBlogRepositoryError('DUPLICATE_SLUG', 'A blog with this slug already exists.')
  return new AdminBlogRepositoryError('SAVE_FAILED', 'Unable to save blog.')
}

export async function createBlogDraft(input: unknown) {
  const admin = await authorize()
  const data = blogDraftSchema.parse(input)
  const db = createAdminClient()
  const { data: existing } = await db.from('blog_posts').select('id').eq('slug', data.slug).maybeSingle()
  if (existing) throw new AdminBlogRepositoryError('DUPLICATE_SLUG', 'A blog with this slug already exists.')
  const { data: post, error } = await db.from('blog_posts').insert({ slug: data.slug, status: 'draft', featured_image_url: data.featuredImageUrl || null, featured_image_alt: data.featuredImageAlt || null, created_by: admin.id, updated_by: admin.id }).select('id, slug, status').single()
  if (error || !post) throw saveError(error)
  const translations = data.translations.filter(supplied)
  if (translations.length) {
    const { error: translationError } = await db.from('blog_post_translations').insert(translations.map((translation) => ({ post_id: post.id, locale: translation.locale, status: 'draft', title: translation.title ?? '', excerpt: translation.excerpt ?? '', content: translation.content ?? '', seo_title: translation.seoTitle || null, meta_description: translation.metaDescription || null })))
    if (translationError) { await db.from('blog_posts').delete().eq('id', post.id); throw saveError(translationError) }
  }
  return { id: post.id, slug: post.slug, status: post.status as CmsBlogStatus }
}

export async function updateBlog(id: string, input: unknown) {
  const admin = await authorize()
  const data = blogDraftSchema.parse(input)
  const current = await getPostRows(id)
  if (!current) throw new AdminBlogRepositoryError('BLOG_NOT_FOUND', 'Blog not found.')
  if (current.post.published_at && data.slug !== current.post.slug) throw new AdminBlogRepositoryError('PUBLISHED_SLUG_LOCKED', 'The slug cannot be changed after publication because it is the public article URL.')
  const db = createAdminClient()
  const { error } = await db.from('blog_posts').update({ slug: data.slug, featured_image_url: data.featuredImageUrl || null, featured_image_alt: data.featuredImageAlt || null, updated_by: admin.id }).eq('id', id)
  if (error) throw saveError(error)
  for (const translation of data.translations.filter(supplied)) {
    const existing = current.translations.find((item) => item.locale === translation.locale)
    const values = { title: translation.title ?? '', excerpt: translation.excerpt ?? '', content: translation.content ?? '', seo_title: translation.seoTitle || null, meta_description: translation.metaDescription || null }
    const result = existing ? await db.from('blog_post_translations').update(values).eq('id', existing.id) : await db.from('blog_post_translations').insert({ post_id: id, locale: translation.locale, status: 'draft', ...values })
    if (result.error) throw saveError(result.error)
  }
  for (const translation of data.translations.filter(supplied)) {
    const existing = current.translations.find((item) => item.locale === translation.locale)
    if (existing?.status === 'published') {
      revalidatePublishedCmsBlog({
        slug: current.post.slug,
        locale: existing.locale,
        counterpartPublished: current.translations.some((item) => item.locale !== existing.locale && item.status === 'published'),
      })
    }
  }
  return getAdminBlogById(id)
}

export async function publishBlogTranslation(blogId: string, localeInput: unknown) {
  const admin = await authorize()
  const locale = blogLocaleSchema.parse(localeInput)
  const current = await getPostRows(blogId)
  if (!current) throw new AdminBlogRepositoryError('BLOG_NOT_FOUND', 'Blog not found.')
  const translation = current.translations.find((item) => item.locale === locale)
  if (!translation) throw new AdminBlogRepositoryError('TRANSLATION_NOT_FOUND', 'Blog translation not found.')
  try {
    blogPublishSchema.parse({
      slug: current.post.slug,
      featuredImageUrl: current.post.featured_image_url ?? '',
      featuredImageAlt: current.post.featured_image_alt ?? undefined,
      translations: [{ locale, title: translation.title, excerpt: translation.excerpt, content: translation.content, seoTitle: translation.seo_title ?? undefined, metaDescription: translation.meta_description ?? undefined }],
    })
  } catch {
    throw new AdminBlogRepositoryError('NOT_READY_TO_PUBLISH', 'This translation is not ready to publish.')
  }
  const db = createAdminClient()
  if (translation.status !== 'published') {
    const { error } = await db.from('blog_post_translations').update({ status: 'published' }).eq('id', translation.id)
    if (error) throw new AdminBlogRepositoryError('PUBLISH_FAILED', 'Unable to publish blog.')
  }
  const update = { status: 'published' as const, updated_by: admin.id, ...(current.post.published_at ? {} : { published_at: new Date().toISOString() }) }
  const { data: post, error } = await db.from('blog_posts').update(update).eq('id', blogId).select('published_at').single()
  if (error || !post) throw new AdminBlogRepositoryError('PUBLISH_FAILED', 'Unable to publish blog.')
  revalidatePublishedCmsBlog({
    slug: current.post.slug,
    locale,
    counterpartPublished: current.translations.some((item) => item.locale !== locale && item.status === 'published'),
  })
  return { blogId, locale, translationStatus: 'published' as const, postStatus: 'published' as const, publishedAt: post.published_at }
}

export async function unpublishBlogTranslation(blogId: string, localeInput: unknown) {
  const admin = await authorize()
  const locale = blogLocaleSchema.parse(localeInput)
  if (!/^[0-9a-f-]{36}$/i.test(blogId)) throw new AdminBlogRepositoryError('BLOG_NOT_FOUND', 'Blog not found.')

  const current = await getPostRows(blogId)
  if (!current) throw new AdminBlogRepositoryError('BLOG_NOT_FOUND', 'Blog not found.')
  const translation = current.translations.find((item) => item.locale === locale)
  if (!translation) throw new AdminBlogRepositoryError('TRANSLATION_NOT_FOUND', 'Blog translation not found.')

  const db = createAdminClient()
  if (translation.status !== 'draft') {
    const { error } = await db.from('blog_post_translations').update({ status: 'draft' }).eq('id', translation.id)
    if (error) throw new AdminBlogRepositoryError('UNPUBLISH_FAILED', 'Unable to unpublish blog.')
  }

  const postStatus: CmsBlogStatus = current.translations.some((item) => item.id !== translation.id && item.status === 'published') ? 'published' : 'draft'
  const { data: post, error } = await db.from('blog_posts').update({ status: postStatus, updated_by: admin.id }).eq('id', blogId).select('published_at').single()
  if (error || !post) throw new AdminBlogRepositoryError('UNPUBLISH_FAILED', 'Unable to unpublish blog.')

  revalidatePublishedCmsBlog({
    slug: current.post.slug,
    locale,
    counterpartPublished: current.translations.some((item) => item.id !== translation.id && item.status === 'published'),
  })

  return { blogId, locale, translationStatus: 'draft' as const, postStatus, publishedAt: post.published_at }
}
