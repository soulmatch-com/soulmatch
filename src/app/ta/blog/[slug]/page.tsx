import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogArticlePage } from '@/components/blog/BlogArticlePage'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  getBlogArticleByTranslationKey,
  getBlogArticleAlternates,
  getBlogUrl,
  getPublishedBlogArticle,
  getPublishedBlogArticles,
} from '@/content/blog/articles'

export function generateStaticParams() {
  return getPublishedBlogArticles('ta').map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getPublishedBlogArticle('ta', slug)
  if (!article) return {}
  const englishArticle = getBlogArticleByTranslationKey('en', article.translationKey)
  if (!englishArticle) return {}
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
  const article = getPublishedBlogArticle('ta', slug)
  if (!article) notFound()
  const englishArticle = getBlogArticleByTranslationKey('en', article.translationKey)
  if (!englishArticle) notFound()
  const url = getBlogUrl(article)

  return (
    <div lang="ta">
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
          mainEntityOfPage: url,
          inLanguage: 'ta',
          publisher: { '@type': 'Organization', name: 'MyThirumanam' },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'முகப்பு', item: 'https://mythirumanam.in/' },
            { '@type': 'ListItem', position: 2, name: 'விழா வழிகாட்டிகள்', item: 'https://mythirumanam.in/ta/blog' },
            { '@type': 'ListItem', position: 3, name: article.title, item: url },
          ],
        },
      ]} />
      <BlogArticlePage article={article} alternateArticle={englishArticle} />
    </div>
  )
}
