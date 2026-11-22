import { NextRequest, NextResponse } from 'next/server'
import { deleteGalleryItem, GalleryRepositoryError, setGalleryItemStatus, updateGalleryItem } from '@/lib/celebrations/gallery-repository'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { galleryItemIdSchema, galleryItemSchema, galleryStatusSchema } from '@/lib/validations/gallery.schema'

function failure(error: unknown) {
  const status = error instanceof GalleryRepositoryError && error.message.includes('consent') ? 400 : 500
  return NextResponse.json({ message: error instanceof GalleryRepositoryError ? error.message : 'Unable to manage gallery item.' }, { status })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  try {
    const { id } = await params
    const itemId = galleryItemIdSchema.parse(id)
    const body = await request.json()
    const status = galleryStatusSchema.safeParse(body)
    if (status.success) await setGalleryItemStatus(itemId, status.data.status)
    else {
      const parsed = galleryItemSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Invalid gallery item.' }, { status: 400 })
      await updateGalleryItem(itemId, parsed.data)
    }
    return NextResponse.json({ success: true })
  } catch (error) { return failure(error) }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response
  try {
    const { id } = await params
    await deleteGalleryItem(galleryItemIdSchema.parse(id))
    return NextResponse.json({ success: true })
  } catch (error) { return failure(error) }
}
