import type { CmsBlogLocale } from '@/lib/blog/cms-types'

export type PublicBlogListItem = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  updatedAt: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  locale: CmsBlogLocale
  /** Present for the existing code-backed articles; CMS articles use a locale label. */
  category?: string
}

export type PublicBlogArticle = PublicBlogListItem & {
  content: string
  seoTitle: string | null
  metaDescription: string | null
}

export type PublicBlogLocaleAvailability = { en: boolean; ta: boolean }

export type PublicBlogSitemapEntry = {
  slug: string
  locale: CmsBlogLocale
  updatedAt: string
}
