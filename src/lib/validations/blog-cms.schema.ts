import { z } from 'zod'
import { getMarkdownHeadingLevels } from '@/components/blog/markdown-article'

export const blogSlugSchema = z.string().trim().min(1, 'Slug is required').max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens only.')
export const blogLocaleSchema = z.enum(['en', 'ta'])
export const blogIdSchema = z.string().uuid('Invalid blog ID.')
const articleBodySchema = z.string().max(50000).refine(
  (content) => getMarkdownHeadingLevels(content).every((level) => level >= 2 && level <= 4),
  'Article body headings must use H2, H3, or H4. The article title is the page H1.',
)

export const blogTranslationDraftSchema = z.object({ locale: blogLocaleSchema, title: z.string().max(150).optional(), excerpt: z.string().max(500).optional(), content: articleBodySchema.optional(), seoTitle: z.string().max(160).optional(), metaDescription: z.string().max(320).optional() })
export const blogDraftSchema = z.object({ slug: blogSlugSchema, featuredImageUrl: z.string().url().optional().or(z.literal('')), featuredImageAlt: z.string().max(200).optional(), translations: z.array(blogTranslationDraftSchema).max(2).superRefine((items, ctx) => { if (new Set(items.map(({ locale }) => locale)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Each language may be supplied once.' }) }) })
export const blogPublishSchema = blogDraftSchema.superRefine((value, ctx) => { if (!value.translations.some((item) => item.title?.trim() && item.excerpt?.trim() && item.content?.trim())) ctx.addIssue({ code: 'custom', message: 'At least one complete translation is required to publish.' }) })
export const blogAdminListSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20), status: z.enum(['all', 'draft', 'published']).default('all'), search: z.string().trim().max(100).default('') })
