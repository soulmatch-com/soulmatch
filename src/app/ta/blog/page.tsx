import type { Metadata } from 'next'
import { BlogListing } from '@/components/blog/BlogListing'
import { JsonLd } from '@/components/seo/JsonLd'
import { getBlogListingUrl, getPublishedBlogArticles } from '@/content/blog/articles'

const url = getBlogListingUrl('ta')
const englishUrl = getBlogListingUrl('en')
const title = 'திருக்கடையூர் விழா வழிகாட்டிகள் | MyThirumanam'
const description =
  '60ஆம், 70ஆம் மற்றும் 80ஆம் திருமண விழாக்களை குடும்பத்துடன் புரிந்துகொண்டு திட்டமிட உதவும் பயனுள்ள வழிகாட்டிகள்.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
    languages: { en: englishUrl, ta: url, 'x-default': englishUrl },
  },
  openGraph: { title, description, url, siteName: 'MyThirumanam', type: 'website' },
}

export default function TamilBlogPage() {
  const articles = getPublishedBlogArticles('ta')

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'திருக்கடையூர் விழா வழிகாட்டிகள்', url, description, inLanguage: 'ta' }} />
      <div lang="ta">
        <BlogListing locale="ta" articles={articles} />
      </div>
    </>
  )
}
