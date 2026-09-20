export const blogLocales = ['en', 'ta'] as const
export type CmsBlogLocale = (typeof blogLocales)[number]
export type CmsBlogStatus = 'draft' | 'published'

export type CmsTranslationInput = { locale: CmsBlogLocale; title?: string; excerpt?: string; content?: string; seoTitle?: string; metaDescription?: string }
export type CmsBlogInput = { slug: string; featuredImageUrl?: string; featuredImageAlt?: string; translations: CmsTranslationInput[] }
export type CmsBlogPost = { id: string; slug: string; status: CmsBlogStatus; featured_image_url: string | null; featured_image_alt: string | null; published_at: string | null; created_at: string; updated_at: string; created_by: string | null; updated_by: string | null }
export type CmsBlogTranslation = { id: string; post_id: string; locale: CmsBlogLocale; status: CmsBlogStatus; title: string; excerpt: string; content: string; seo_title: string | null; meta_description: string | null; published_at: string | null; created_at: string; updated_at: string }
