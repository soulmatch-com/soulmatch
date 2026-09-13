import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogArticlePage } from '@/components/blog/BlogArticlePage'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  getBlogArticleByTranslationKey,
  getBlogUrl,
  getPublishedBlogArticle,
  getPublishedBlogArticles,
} from '@/content/blog/articles'

export function generateStaticParams() {
  return getPublishedBlogArticles('en').map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getPublishedBlogArticle('en', slug)
  if (!article) return {}
  const tamilArticle = getBlogArticleByTranslationKey('ta', article.translationKey)
  const url = getBlogUrl(article)

  return {
    title: '60th Marriage in Thirukadaiyur: Planning Guide',
    description: article.description,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ...(tamilArticle ? { ta: getBlogUrl(tamilArticle) } : {}),
        'x-default': url,
      },
    },
    openGraph: { title: article.title, description: article.description, url, siteName: 'MyThirumanam', type: 'article' },
  }
}

export default async function EnglishBlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getPublishedBlogArticle('en', slug)
  if (!article) notFound()
  const tamilArticle = getBlogArticleByTranslationKey('ta', article.translationKey)
  if (!tamilArticle) notFound()
  const url = getBlogUrl(article)

  return (
    <>
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
          mainEntityOfPage: url,
          inLanguage: 'en',
          publisher: { '@type': 'Organization', name: 'MyThirumanam' },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mythirumanam.in/' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://mythirumanam.in/blog' },
            { '@type': 'ListItem', position: 3, name: article.title, item: url },
          ],
        },
      ]} />
      <BlogArticlePage article={article} alternateArticle={tamilArticle} />
    </>
  )
}
