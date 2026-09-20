import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlogArticlePage } from '@/components/blog/BlogArticlePage'
import { CmsBlogArticlePage } from '@/components/blog/CmsBlogArticlePage'
import { JsonLd } from '@/components/seo/JsonLd'
import { getBlogArticleByTranslationKey, getBlogArticleAlternates, getBlogUrl } from '@/content/blog/articles'
import { getPublicCmsBlogMetadata, getPublicCmsBlogStructuredData } from '@/lib/blog/public-blog-seo'
import { getPublicBlogBySlug, getPublicBlogLocales, getPublicBlogStaticSlugs } from '@/lib/blog/public-blog-source'

export async function generateStaticParams() {
  return getPublicBlogStaticSlugs('ta')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await getPublicBlogBySlug(slug, 'ta')
  if (!result) return {}
  if (result.source === 'cms') return getPublicCmsBlogMetadata(result.article, await getPublicBlogLocales(slug))

  const englishArticle = getBlogArticleByTranslationKey('en', result.article.translationKey)
  if (!englishArticle) return {}
  const article = result.article
  const url = getBlogUrl(article)
  return {
    title: article.seoTitle ?? article.title,
    description: article.description,
    robots: { index: true, follow: true },
    alternates: getBlogArticleAlternates(article),
    openGraph: { title: article.title, description: article.description, url, siteName: 'MyThirumanam', type: 'article' },
  }
}

export default async function TamilBlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getPublicBlogBySlug(slug, 'ta')
  if (!result) notFound()

  if (result.source === 'cms') {
    const availableLocales = await getPublicBlogLocales(slug)
    return <div lang="ta"><JsonLd data={getPublicCmsBlogStructuredData(result.article)} /><CmsBlogArticlePage article={result.article} availableLocales={availableLocales} /></div>
  }

  const englishArticle = getBlogArticleByTranslationKey('en', result.article.translationKey)
  if (!englishArticle) notFound()
  const url = getBlogUrl(result.article)
  return (
    <div lang="ta">
      <JsonLd data={[
        { '@context': 'https://schema.org', '@type': 'Article', headline: result.article.title, description: result.article.description, datePublished: result.article.publishedAt, ...(result.article.updatedAt ? { dateModified: result.article.updatedAt } : {}), mainEntityOfPage: url, inLanguage: 'ta', publisher: { '@type': 'Organization', name: 'MyThirumanam' } },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'முகப்பு', item: 'https://mythirumanam.in/' }, { '@type': 'ListItem', position: 2, name: 'விழா வழிகாட்டிகள்', item: 'https://mythirumanam.in/ta/blog' }, { '@type': 'ListItem', position: 3, name: result.article.title, item: url }] },
      ]} />
      <BlogArticlePage article={result.article} alternateArticle={englishArticle} />
    </div>
  )
}
