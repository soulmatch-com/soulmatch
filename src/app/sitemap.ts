import type { MetadataRoute } from 'next'
import { getPublicBlogEntriesForSitemap } from '@/lib/blog/public-blog-source'
import type { PublicBlogSourceSitemapEntry } from '@/lib/blog/public-blog-source'

const origin = 'https://mythirumanam.in'
const staticPaths = ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/matrimony', '/about', '/gallery', '/terms', '/privacy', '/contact', '/blog', '/ta/blog']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogEntries = await getPublicBlogEntriesForSitemap()
  const entries: PublicBlogSourceSitemapEntry[] = [
    ...staticPaths.map((path): PublicBlogSourceSitemapEntry => ({ path })),
    ...blogEntries,
  ]
  const seen = new Set<string>()

  return entries.flatMap(({ path, updatedAt }) => {
    const url = `${origin}${path}`
    if (seen.has(url)) return []
    seen.add(url)
    return [{
      url,
      changeFrequency: path === '/' ? 'weekly' as const : 'monthly' as const,
      priority: path === '/' ? 1 : 0.8,
      ...(updatedAt ? { lastModified: updatedAt } : {}),
    }]
  })
}
