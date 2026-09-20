import type { Metadata } from 'next'

import type { CmsBlogLocale } from '@/lib/blog/cms-types'
import type { PublicBlogArticle, PublicBlogLocaleAvailability } from '@/lib/blog/public-blog-types'

const siteUrl = 'https://mythirumanam.in'

export function getPublicCmsBlogPath(locale: CmsBlogLocale, slug: string) {
  return locale === 'en' ? `/blog/${slug}` : `/ta/blog/${slug}`
}

export function getPublicCmsBlogUrl(locale: CmsBlogLocale, slug: string) {
  return `${siteUrl}${getPublicCmsBlogPath(locale, slug)}`
}

export function getPublicCmsBlogAlternates(
  locale: CmsBlogLocale,
  slug: string,
  available: PublicBlogLocaleAvailability,
) {
  const englishUrl = getPublicCmsBlogUrl('en', slug)
  const tamilUrl = getPublicCmsBlogUrl('ta', slug)

  return {
    canonical: getPublicCmsBlogUrl(locale, slug),
    languages: {
      ...(available.en ? { en: englishUrl } : {}),
      ...(available.ta ? { ta: tamilUrl } : {}),
      // English remains the site's conservative x-default only when it is public.
      ...(available.en ? { 'x-default': englishUrl } : {}),
    },
  }
}

export function getPublicCmsBlogMetadata(
  article: PublicBlogArticle,
  available: PublicBlogLocaleAvailability,
): Metadata {
  const title = article.seoTitle || article.title
  const description = article.metaDescription || article.excerpt
  const url = getPublicCmsBlogUrl(article.locale, article.slug)
  const image = article.featuredImageUrl
    ? [{ url: article.featuredImageUrl, ...(article.featuredImageAlt ? { alt: article.featuredImageAlt } : {}) }]
    : undefined

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: getPublicCmsBlogAlternates(article.locale, article.slug, available),
    openGraph: {
      title,
      description,
      url,
      siteName: 'MyThirumanam',
      type: 'article',
      ...(image ? { images: image } : {}),
    },
  }
}

export function getPublicCmsBlogStructuredData(article: PublicBlogArticle) {
  const url = getPublicCmsBlogUrl(article.locale, article.slug)
  const isTamil = article.locale === 'ta'

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.metaDescription || article.excerpt,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      mainEntityOfPage: url,
      inLanguage: article.locale,
      ...(article.featuredImageUrl ? { image: article.featuredImageUrl } : {}),
      publisher: { '@type': 'Organization', name: 'MyThirumanam' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: isTamil ? 'முகப்பு' : 'Home', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: isTamil ? 'விழா வழிகாட்டிகள்' : 'Blog', item: `${siteUrl}${isTamil ? '/ta/blog' : '/blog'}` },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ]
}
