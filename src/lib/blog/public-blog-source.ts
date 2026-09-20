import 'server-only'

import type { BlogArticle, BlogLocale } from '@/content/blog/articles'
import {
  getBlogArticleByTranslationKey,
  getPublishedBlogArticle,
  getPublishedBlogArticles,
} from '@/content/blog/articles'
import { isPublicBlogCmsEnabled } from '@/lib/blog/public-blog-feature'
import {
  getPublishedBlogBySlug,
  getPublishedBlogEntriesForSitemap,
  getPublishedBlogLocales,
  getPublishedBlogPosts,
} from '@/lib/blog/public-blog-repository'
import type {
  PublicBlogArticle,
  PublicBlogListItem,
  PublicBlogLocaleAvailability,
  PublicBlogSitemapEntry,
} from '@/lib/blog/public-blog-types'

export type PublicBlogSourceArticle =
  | { source: 'code'; article: BlogArticle }
  | { source: 'cms'; article: PublicBlogArticle }

export type PublicBlogSourceSitemapEntry = {
  path: string
  updatedAt?: string
}

function toPublicListItem(article: BlogArticle): PublicBlogListItem {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt ?? article.publishedAt,
    featuredImageUrl: null,
    featuredImageAlt: null,
    locale: article.locale,
    category: article.category,
  }
}

export async function getPublicBlogPosts(locale: BlogLocale) {
  if (isPublicBlogCmsEnabled()) return getPublishedBlogPosts(locale)

  const items = getPublishedBlogArticles(locale).map(toPublicListItem)
  return { items, page: 1, pageSize: 20, total: items.length }
}

export async function getPublicBlogBySlug(slug: string, locale: BlogLocale): Promise<PublicBlogSourceArticle | null> {
  if (isPublicBlogCmsEnabled()) {
    const article = await getPublishedBlogBySlug(slug, locale)
    return article ? { source: 'cms', article } : null
  }

  const article = getPublishedBlogArticle(locale, slug)
  return article ? { source: 'code', article } : null
}

export async function getPublicBlogLocales(slug: string): Promise<PublicBlogLocaleAvailability> {
  if (isPublicBlogCmsEnabled()) return getPublishedBlogLocales(slug)

  const english = getPublishedBlogArticle('en', slug)
  const tamil = getPublishedBlogArticle('ta', slug)
  if (english) return { en: true, ta: Boolean(getBlogArticleByTranslationKey('ta', english.translationKey)) }
  if (tamil) return { en: Boolean(getBlogArticleByTranslationKey('en', tamil.translationKey)), ta: true }
  return { en: false, ta: false }
}

function getPublicBlogPath(locale: BlogLocale, slug: string) {
  return locale === 'en' ? `/blog/${slug}` : `/ta/blog/${slug}`
}

/** Uses one inventory at a time: legacy code while off, published CMS locales while on. */
export async function getPublicBlogEntriesForSitemap(): Promise<PublicBlogSourceSitemapEntry[]> {
  if (isPublicBlogCmsEnabled()) {
    const entries = await getPublishedBlogEntriesForSitemap()
    return entries.map((entry: PublicBlogSitemapEntry) => ({
      path: getPublicBlogPath(entry.locale, entry.slug),
      updatedAt: entry.updatedAt,
    }))
  }

  return (['en', 'ta'] as const).flatMap((locale) =>
    getPublishedBlogArticles(locale).map((article) => ({ path: getPublicBlogPath(locale, article.slug) })),
  )
}

/** CMS slugs are runtime data, so they are intentionally not pre-rendered. */
export async function getPublicBlogStaticSlugs(locale: BlogLocale) {
  if (isPublicBlogCmsEnabled()) return [] as Array<{ slug: string }>
  return getPublishedBlogArticles(locale).map((article) => ({ slug: article.slug }))
}
