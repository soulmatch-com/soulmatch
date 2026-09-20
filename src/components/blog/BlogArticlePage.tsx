import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BlogArticle, BlogLocale, BlogSection } from '@/content/blog/articles'
import { getBlogPath } from '@/content/blog/articles'
import { CelebrationBreadcrumbs } from '@/components/celebrations/CelebrationBreadcrumbs'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'
import { formatBlogDate } from '@/lib/blog/format-blog-date'

type ArticleRenderProps = {
  article: BlogArticle
  alternateArticle: BlogArticle
}

export function BlogArticlePage({ article, alternateArticle }: ArticleRenderProps) {
  const isTamil = article.locale === 'ta'
  const alternateLabel = isTamil ? 'English' : 'தமிழ்'
  const currentLabel = isTamil ? 'தமிழ்' : 'English'

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
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-200">{article.category}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">{article.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-amber-50">{article.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-semibold text-amber-100">
              <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt, article.locale)}</time>
              <span aria-hidden="true">/</span>
              <span>{isTamil ? '60ஆம் திருமணம்' : '60th Marriage'}</span>
            </div>
            <nav aria-label="Article language" className="mt-8 flex items-center gap-3 text-sm font-bold">
              <span aria-current="page" className="rounded-full bg-white px-4 py-2 text-stone-900">
                {currentLabel}
              </span>
              <Link
                href={getBlogPath(alternateArticle)}
                hrefLang={alternateArticle.locale}
                className="rounded-full border border-white/50 px-4 py-2 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {alternateLabel}
              </Link>
            </nav>
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <div className="space-y-8 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-8">
              {article.body.map((section, index) => (
                <ArticleSection key={`${section.type}-${index}`} section={section} locale={article.locale} />
              ))}
            </div>

            <section className="mt-10 rounded-2xl bg-gradient-to-r from-[#681c24] to-[#9a3b2f] p-6 text-white sm:p-8">
              <h2 className="text-2xl font-bold">{article.cta.title}</h2>
              <p className="mt-3 max-w-2xl leading-7 text-amber-50">{article.cta.text}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={article.cta.href}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-stone-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {article.cta.label} <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Link>
                {article.cta.secondaryLabel && article.cta.secondaryHref ? (
                  <Link
                    href={article.cta.secondaryHref}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 px-6 py-3 font-bold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    {article.cta.secondaryLabel}
                  </Link>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">{isTamil ? 'தொடர்புடைய இணைப்புகள்' : 'Related links'}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {article.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-semibold text-amber-800 hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <IndependentServiceNotice className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-stone-700" />
          </aside>
        </div>
      </article>
    </main>
  )
}

function ArticleSection({ section, locale }: { section: BlogSection; locale: BlogLocale }) {
  switch (section.type) {
    case 'heading':
      return <h2 className="text-2xl font-bold text-stone-950">{section.text}</h2>
    case 'paragraph':
      return <p className="leading-8 text-stone-700">{section.text}</p>
    case 'note':
      return (
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 leading-7 text-stone-800">
          <p className="font-semibold">{locale === 'ta' ? 'குறிப்பு' : 'Content note'}</p>
          <p className="mt-2">{section.text}</p>
        </aside>
      )
    case 'list':
      return (
        <ul className="list-disc space-y-3 pl-6 leading-8 text-stone-700">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'comparison':
      return (
        <div className="overflow-x-auto rounded-2xl border border-amber-200">
          <table className="min-w-full border-collapse text-left text-sm leading-6 text-stone-700">
            <thead className="bg-amber-50 text-stone-950">
              <tr>{section.headers.map((header) => <th key={header} scope="col" className="p-4 font-bold">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-amber-200 bg-white">
              {section.rows.map(([area, oneSession, twoSessions]) => (
                <tr key={area}>
                  <th scope="row" className="p-4 font-bold text-stone-950">{area}</th>
                  <td className="p-4">{oneSession}</td>
                  <td className="p-4">{twoSessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'faq':
      return (
        <section aria-labelledby="article-faq-heading" className="space-y-4">
          <h2 id="article-faq-heading" className="text-2xl font-bold text-stone-950">
            {locale === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Frequently asked questions'}
          </h2>
          <div className="divide-y divide-amber-200 rounded-2xl border border-amber-200">
            {section.items.map((item) => (
              <details className="p-5" key={item.question}>
                <summary className="cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700">
                  {item.question}
                </summary>
                <p className="mt-3 leading-7 text-stone-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )
  }
}
