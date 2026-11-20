import { NextRequest, NextResponse } from 'next/server'
import { createGalleryItem, getAdminGalleryItems, GalleryRepositoryError } from '@/lib/celebrations/gallery-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { galleryItemSchema } from '@/lib/validations/gallery.schema'

function message(error: unknown) {
  return error instanceof GalleryRepositoryError ? error.message : 'Unable to manage gallery items.'
}

function unexpectedErrorResponse(error: unknown) {
  console.error('Admin gallery request failed', error)
  return NextResponse.json({
    message: message(error),
    ...(process.env.NODE_ENV === 'development' && error instanceof Error ? { debug: error.message } : {}),
  }, { status: 500 })
}

export async function GET() {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  try { return NextResponse.json({ items: await getAdminGalleryItems() }) } catch (error) { return unexpectedErrorResponse(error) }
}

export async function POST(request: NextRequest) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  try {
    const body = await request.json()
    const parsed = galleryItemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Invalid gallery item.' }, { status: 400 })
    const item = await createGalleryItem(parsed.data)
    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error) { return unexpectedErrorResponse(error) }
}
