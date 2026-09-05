import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: ['/'], disallow: ['/admin/', '/api/', '/dashboard/', '/profile/', '/settings/', '/interests/'] }, sitemap: 'https://mythirumanam.in/sitemap.xml' }
}
