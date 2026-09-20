import 'server-only'

import { revalidatePath } from 'next/cache'

import type { CmsBlogLocale } from '@/lib/blog/cms-types'
import { isPublicBlogCmsEnabled } from '@/lib/blog/public-blog-feature'

function articlePath(locale: CmsBlogLocale, slug: string) {
  return locale === 'en' ? `/blog/${slug}` : `/ta/blog/${slug}`
}

/** Invalidates only the CMS public inventory, and only after a successful server mutation. */
export function revalidatePublishedCmsBlog({
  slug,
  locale,
  counterpartPublished,
}: {
  slug: string
  locale: CmsBlogLocale
  counterpartPublished: boolean
}) {
  if (!isPublicBlogCmsEnabled()) return

  const counterpart: CmsBlogLocale = locale === 'en' ? 'ta' : 'en'
  const paths = new Set([
    locale === 'en' ? '/blog' : '/ta/blog',
    articlePath(locale, slug),
    '/sitemap.xml',
    ...(counterpartPublished ? [articlePath(counterpart, slug)] : []),
  ])

  try {
    for (const path of paths) revalidatePath(path)
  } catch {
    // A mutation remains durable; log the cache failure without leaking internals to admins.
    console.error('CMS public blog revalidation failed')
  }
}
