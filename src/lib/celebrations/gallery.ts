/**
 * Curated public Gallery content. See claudedocs/GALLERY_ASSET_AUDIT.md.
 * Add only local, project-owned images with documented publication approval.
 * An event photo also requires approval for any identifiable people.
 */
export type CelebrationGalleryItem = {
  id: string
  src: `/${string}`
  alt: string
  title: string
  caption: string
  category: GalleryCategory
  width: number
  height: number
  publicationType: 'approved-event-photo' | 'brand-artwork'
}

export type GalleryCategory = 'Brand Artwork'

export const galleryBrandArtwork = {
  id: 'mythirumanam-emblem',
  src: '/icon.png',
  alt: 'MyThirumanam maroon and gold temple, couple and monogram emblem',
  title: 'The MyThirumanam emblem',
  caption: 'MyThirumanam brand artwork, not a photograph of a customer or ceremony.',
  category: 'Brand Artwork',
  width: 512,
  height: 512,
  publicationType: 'brand-artwork',
} as const satisfies CelebrationGalleryItem

export const approvedCelebrationGalleryItems: readonly CelebrationGalleryItem[] = []

export const celebrationGalleryItems: readonly CelebrationGalleryItem[] = [
  galleryBrandArtwork,
]

export const homepageGalleryPreviewItems = approvedCelebrationGalleryItems.slice(0, 6)
