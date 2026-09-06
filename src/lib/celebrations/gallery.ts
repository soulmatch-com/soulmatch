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
  category: string
  width: number
  height: number
  kind: 'event-photo' | 'brand-art'
}

export const galleryBrandArtwork = {
  id: 'mythirumanam-emblem',
  src: '/icon.png',
  alt: 'MyThirumanam maroon and gold temple, couple and monogram emblem',
  title: 'The MyThirumanam emblem',
  caption: 'MyThirumanam brand artwork, not a photograph of a customer or ceremony.',
  category: 'Brand artwork',
  width: 512,
  height: 512,
  kind: 'brand-art',
} as const satisfies CelebrationGalleryItem

export const celebrationGalleryItems: readonly CelebrationGalleryItem[] = [
  galleryBrandArtwork,
]
