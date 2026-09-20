import type { Metadata } from 'next'
import { BlogListing } from '@/components/blog/BlogListing'
import { JsonLd } from '@/components/seo/JsonLd'
import { getBlogListingUrl } from '@/content/blog/articles'
import { getPublicBlogPosts } from '@/lib/blog/public-blog-source'

const url = getBlogListingUrl('en')
const tamilUrl = getBlogListingUrl('ta')
const title = 'Thirukadaiyur Celebration Guides | MyThirumanam'
const description =
  'Practical guides to help families understand and plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
    languages: { en: url, ta: tamilUrl, 'x-default': url },
  },
  openGraph: { title, description, url, siteName: 'MyThirumanam', type: 'website' },
}

export default async function BlogPage() {
  const { items: articles } = await getPublicBlogPosts('en')

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Thirukadaiyur Celebration Guides', url, description, inLanguage: 'en' }} />
      <BlogListing locale="en" articles={articles} />
    </>
  )
}
