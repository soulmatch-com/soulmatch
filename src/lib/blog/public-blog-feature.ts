import 'server-only'

export function isPublicBlogCmsEnabled() {
  return process.env.BLOG_CMS_PUBLIC_ENABLED === 'true'
}
