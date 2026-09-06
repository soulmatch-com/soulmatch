import type { MetadataRoute } from 'next'

const origin = 'https://mythirumanam.in'
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/matrimony', '/about', '/gallery']
  return paths.map((path) => ({ url: `${origin}${path}`, changeFrequency: path === '/' ? 'weekly' : 'monthly', priority: path === '/' ? 1 : 0.8 }))
}
