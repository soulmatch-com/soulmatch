import 'server-only'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { galleryItemSchema, type GalleryItemInput } from '@/lib/validations/gallery.schema'

export type GalleryStatus = 'draft' | 'published'
export type CelebrationGalleryRecord = {
  id: string
  image_url: string
  cloudinary_public_id: string
  alt_text: string
  title: string
  event_name: string
  caption: string
  category: string
  status: GalleryStatus
  publication_consent_confirmed: boolean
  width: number
  height: number
  display_order: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export class GalleryRepositoryError extends Error {
  constructor(message: string) { super(message) }
}

async function authorize() {
  const result = await requireActiveAdmin()
  if ('response' in result) throw new GalleryRepositoryError('Unauthorized admin request.')
  return result.admin
}

function publicPaths() {
  return ['/gallery', '/']
}

function revalidateGallery() {
  try { for (const path of publicPaths()) revalidatePath(path) } catch { console.error('Gallery revalidation failed') }
}

export async function getPublishedGalleryPage(offset = 0, limit = 12): Promise<{ items: CelebrationGalleryRecord[]; hasMore: boolean }> {
  const db = createAdminClient()
  const safeOffset = Math.max(0, Math.floor(offset))
  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)))
  const { data, error } = await db.from('celebration_gallery_items').select('id, image_url, cloudinary_public_id, alt_text, title, event_name, caption, category, status, publication_consent_confirmed, width, height, display_order, published_at, created_at, updated_at').eq('status', 'published').eq('publication_consent_confirmed', true).order('display_order').order('published_at', { ascending: false }).range(safeOffset, safeOffset + safeLimit)
  if (error) { console.error('Public gallery read failed'); return { items: [], hasMore: false } }
  const items = (data ?? []) as CelebrationGalleryRecord[]
  return { items: items.slice(0, safeLimit), hasMore: items.length > safeLimit }
}

export async function getAdminGalleryItems(): Promise<CelebrationGalleryRecord[]> {
  await authorize()
  const db = createAdminClient()
  const { data, error } = await db.from('celebration_gallery_items').select('id, image_url, cloudinary_public_id, alt_text, title, event_name, caption, category, status, publication_consent_confirmed, width, height, display_order, published_at, created_at, updated_at').order('display_order').order('created_at', { ascending: false })
  if (error) throw new GalleryRepositoryError('Unable to load gallery items. Apply the gallery migration if it has not run yet.')
  return (data ?? []) as CelebrationGalleryRecord[]
}

export async function createGalleryItem(input: unknown) {
  const admin = await authorize()
  const item = galleryItemSchema.parse(input)
  const db = createAdminClient()
  const { data, error } = await db.from('celebration_gallery_items').insert(toRow(item, admin.id)).select('id').single()
  if (error?.code === '23514') throw new GalleryRepositoryError('A gallery event can contain at most five photographs.')
  if (error || !data) {
    console.error('Gallery item insert failed', { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint })
    const detail = process.env.NODE_ENV === 'development' && error?.message ? `: ${error.message}` : ''
    throw new GalleryRepositoryError(`Unable to save gallery item.${detail}`)
  }
  return data
}

function toRow(item: GalleryItemInput, adminId: string) {
  return { image_url: item.imageUrl, cloudinary_public_id: item.cloudinaryPublicId, alt_text: item.altText, title: item.title, event_name: item.eventName, caption: item.caption, category: item.category, publication_consent_confirmed: item.publicationConsentConfirmed, width: item.width, height: item.height, display_order: item.displayOrder, created_by: adminId, updated_by: adminId }
}

export async function updateGalleryItem(id: string, input: unknown) {
  const admin = await authorize()
  const item = galleryItemSchema.parse(input)
  const db = createAdminClient()
  const { error } = await db.from('celebration_gallery_items').update({ ...toRow(item, admin.id), updated_by: admin.id }).eq('id', id)
  if (error) throw new GalleryRepositoryError('Unable to update gallery item.')
  revalidateGallery()
}

export async function setGalleryItemStatus(id: string, status: GalleryStatus) {
  const admin = await authorize()
  const db = createAdminClient()
  const { data: item, error: readError } = await db.from('celebration_gallery_items').select('publication_consent_confirmed').eq('id', id).maybeSingle()
  if (readError || !item) throw new GalleryRepositoryError('Gallery item not found.')
  if (status === 'published' && !item.publication_consent_confirmed) throw new GalleryRepositoryError('Confirm publication consent before publishing this photograph.')
  const { error } = await db.from('celebration_gallery_items').update({ status, updated_by: admin.id, ...(status === 'published' ? { published_at: new Date().toISOString() } : {}) }).eq('id', id)
  if (error) throw new GalleryRepositoryError('Unable to update publication status.')
  revalidateGallery()
}

export async function deleteGalleryItem(id: string) {
  await authorize()
  const db = createAdminClient()
  const { error } = await db.from('celebration_gallery_items').delete().eq('id', id)
  if (error) throw new GalleryRepositoryError('Unable to delete gallery item.')
  revalidateGallery()
}
