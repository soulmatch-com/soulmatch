import { z } from 'zod'

export const galleryItemSchema = z.object({
  imageUrl: z.string().url().refine((value) => new URL(value).hostname === 'res.cloudinary.com', 'Gallery images must be hosted on Cloudinary.'),
  cloudinaryPublicId: z.string().trim().min(1).max(300),
  altText: z.string().trim().min(10, 'Describe the photograph for screen-reader users.').max(200),
  title: z.string().trim().min(1).max(120),
  eventName: z.string().trim().min(1, 'Event name is required.').max(120),
  caption: z.string().trim().max(500),
  category: z.string().trim().min(1).max(80),
  publicationConsentConfirmed: z.boolean(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  displayOrder: z.number().int().min(0).max(10000).default(0),
})

export const galleryItemIdSchema = z.string().uuid('Invalid gallery item ID.')
export const galleryStatusSchema = z.object({ status: z.enum(['draft', 'published']) })

export type GalleryItemInput = z.infer<typeof galleryItemSchema>
