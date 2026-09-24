import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BlogLocale } from '@/content/blog/articles'
import { getBlogListingPath } from '@/content/blog/articles'
import type { PublicBlogListItem } from '@/lib/blog/public-blog-types'
import { formatBlogDate } from '@/lib/blog/format-blog-date'
import { BlogSubscriptionBox } from './BlogSubscriptionBox'

type BlogListingCopy = {
  eyebrow: string
  title: string
  description: string
  readLabel: string
  empty: string
}

const listingCopy: Record<BlogLocale, BlogListingCopy> = {
  en: {
    eyebrow: 'MyThirumanam Blog',
    title: 'Thirukadaiyur Celebration Guides',
    description:
      'Practical guides to help families understand and plan 60th, 70th and 80th marriage celebrations in Thirukadaiyur.',
    readLabel: 'Read guide',
    empty: 'Published celebration guides will appear here.',
  },
  ta: {
    eyebrow: 'MyThirumanam வழிகாட்டிகள்',
    title: 'திருக்கடையூர் விழா வழிகாட்டிகள்',
    description:
      '60ஆம், 70ஆம் மற்றும் 80ஆம் திருமண விழாக்களை குடும்பத்துடன் புரிந்துகொண்டு திட்டமிட உதவும் பயனுள்ள வழிகாட்டிகள்.',
    readLabel: 'வழிகாட்டியை படிக்கவும்',
    empty: 'வெளியிடப்பட்ட விழா வழிகாட்டிகள் இங்கே காணப்படும்.',
  },
}

function getArticlePath(article: Pick<PublicBlogListItem, 'locale' | 'slug'>) {
  return article.locale === 'en' ? `/blog/${article.slug}` : `/ta/blog/${article.slug}`
}

export function BlogListing({ locale, articles }: { locale: BlogLocale; articles: readonly PublicBlogListItem[] }) {
  const copy = listingCopy[locale]
  const otherLocale = locale === 'en' ? 'ta' : 'en'
  const currentLabel = locale === 'en' ? 'English' : 'தமிழ்'
  const otherLabel = locale === 'en' ? 'தமிழ்' : 'English'

  return (
    <main className="min-h-screen bg-[#fffaf3] text-stone-900">
      <section className="overflow-hidden bg-gradient-to-br from-[#5d1720] via-[#8f2d2e] to-[#bd6b2f] text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold sm:text-5xl">{copy.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-amber-50">{copy.description}</p>
          <nav aria-label="Language" className="mt-8 flex items-center gap-3 text-sm font-bold">
            <span aria-current="page" className="rounded-full bg-white px-4 py-2 text-stone-900">
              {currentLabel}
            </span>
            <Link
              href={getBlogListingPath(otherLocale)}
              hrefLang={otherLocale}
              className="rounded-full border border-white/50 px-4 py-2 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              {otherLabel}
            </Link>
          </nav>
        </div>
      </section>

      <section aria-labelledby="blog-list-heading" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="blog-list-heading" className="sr-only">
          {copy.title}
        </h2>
        {articles.length === 0 ? (
          <p className="rounded-2xl border border-amber-200 bg-white p-6 text-stone-700">{copy.empty}</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {articles.map((article) => (
              <article key={`${article.locale}-${article.slug}`} className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">{article.category ?? (locale === 'ta' ? 'விழா வழிகாட்டி' : 'Celebration guide')}</p>
                <h2 className="mt-3 text-2xl font-bold text-stone-950">
                  <Link
                    href={getArticlePath(article)}
                    className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-3 leading-7 text-stone-600">{article.excerpt}</p>
                <p className="mt-4 text-sm font-semibold text-stone-500">
                  <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt, locale)}</time>
                </p>
                <Link
                  href={getArticlePath(article)}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                >
                  {copy.readLabel} <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Link>
              </article>
            ))}
          </div>
        )}
        <BlogSubscriptionBox locale={locale} source="blog_listing" />
      </section>
    </main>
  )
}
