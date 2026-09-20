import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { AdminBlogRepositoryError } from '@/lib/blog/admin-blog-repository'

export function blogMutationErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) return NextResponse.json({ message: 'Invalid blog details.' }, { status: 400 })

  if (error instanceof AdminBlogRepositoryError) {
    const statusByCode: Record<AdminBlogRepositoryError['code'], number> = {
      BLOG_NOT_FOUND: 404,
      TRANSLATION_NOT_FOUND: 404,
      DUPLICATE_SLUG: 409,
      PUBLISHED_SLUG_LOCKED: 409,
      NOT_READY_TO_PUBLISH: 400,
      PUBLISH_FAILED: 500,
      UNPUBLISH_FAILED: 500,
      SAVE_FAILED: 500,
      READ_FAILED: 500,
    }
    const messageByCode: Record<AdminBlogRepositoryError['code'], string> = {
      BLOG_NOT_FOUND: 'Blog not found.',
      TRANSLATION_NOT_FOUND: 'Blog translation not found.',
      DUPLICATE_SLUG: 'A blog with this slug already exists.',
      PUBLISHED_SLUG_LOCKED: 'The slug cannot be changed after publication because it is the public article URL.',
      NOT_READY_TO_PUBLISH: 'This translation is not ready to publish.',
      PUBLISH_FAILED: 'Unable to publish blog.',
      UNPUBLISH_FAILED: 'Unable to unpublish blog.',
      SAVE_FAILED: 'Unable to save blog.',
      READ_FAILED: 'Unable to load blog.',
    }
    return NextResponse.json({ message: messageByCode[error.code] }, { status: statusByCode[error.code] })
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 })
}

export function localeMessage(locale: 'en' | 'ta', action: 'published' | 'unpublished') {
  return `${locale === 'en' ? 'English' : 'Tamil'} blog ${action} successfully.`
}
