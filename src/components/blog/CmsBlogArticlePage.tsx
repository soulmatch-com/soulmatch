import Link from 'next/link'

import { MarkdownArticle } from '@/components/blog/MarkdownArticle'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'
import { getPublicCmsBlogPath } from '@/lib/blog/public-blog-seo'
import type { PublicBlogArticle, PublicBlogLocaleAvailability } from '@/lib/blog/public-blog-types'
import { formatBlogDate } from '@/lib/blog/format-blog-date'

export function CmsBlogArticlePage({
  article,
  availableLocales,
}: {
  article: PublicBlogArticle
  availableLocales: PublicBlogLocaleAvailability
}) {
  const isTamil = article.locale === 'ta'
  const alternateLocale = isTamil ? 'en' : 'ta'
  const alternateAvailable = availableLocales[alternateLocale]

  return (
    <main className="min-h-screen bg-[#fffaf3] text-stone-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <CelebrationBreadcrumbs
          items={[
            { label: isTamil ? 'முகப்பு' : 'Home', href: '/' },
            { label: isTamil ? 'விழா வழிகாட்டிகள்' : 'Blog', href: isTamil ? '/ta/blog' : '/blog' },
            { label: article.title },
          ]}
        />
      </div>

      <article>
        <header className="bg-gradient-to-br from-[#5d1720] via-[#8f2d2e] to-[#bd6b2f] text-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-18">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">{isTamil ? 'விழா வழிகாட்டி' : 'Celebration guide'}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">{article.title}</h1>
            {article.excerpt ? <p className="mt-6 max-w-3xl text-lg leading-8 text-amber-50">{article.excerpt}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold text-amber-100">
              <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt, article.locale)}</time>
            </div>
            {alternateAvailable ? (
              <nav aria-label="Article language" className="mt-8 flex items-center gap-3 text-sm font-bold">
                <span aria-current="page" className="rounded-full bg-white px-4 py-2 text-stone-900">{isTamil ? 'தமிழ்' : 'English'}</span>
                <Link
                  href={getPublicCmsBlogPath(alternateLocale, article.slug)}
                  hrefLang={alternateLocale}
                  className="rounded-full border border-white/50 px-4 py-2 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {isTamil ? 'English' : 'தமிழ்'}
                </Link>
              </nav>
            ) : null}
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-8">
            <MarkdownArticle content={article.content} />
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <IndependentServiceNotice className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-stone-700" />
          </aside>
        </div>
      </article>
    </main>
  )
}
