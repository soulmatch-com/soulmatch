import type { MetadataRoute } from 'next'
import { getBlogPath, getBlogListingPath, getPublishedBlogArticles } from '@/content/blog/articles'

const origin = 'https://mythirumanam.in'
export default function sitemap(): MetadataRoute.Sitemap {
  const blogPaths = [
    getBlogListingPath('en'),
    ...getPublishedBlogArticles('en').map(getBlogPath),
    getBlogListingPath('ta'),
    ...getPublishedBlogArticles('ta').map(getBlogPath),
  ]
  const paths = ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/matrimony', '/about', '/gallery', '/terms', '/privacy', '/contact', ...blogPaths]
  return paths.map((path) => ({ url: `${origin}${path}`, changeFrequency: path === '/' ? 'weekly' : 'monthly', priority: path === '/' ? 1 : 0.8 }))
}
