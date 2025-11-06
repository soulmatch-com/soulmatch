import { z } from 'zod'

/**
 * Success Story Validation Schemas
 * Used for validating success story creation and updates
 */

export const successStorySchema = z.object({
  // Profile Links (optional - can be null for anonymous stories)
  profile1_id: z.string().uuid().nullable().optional(),
  profile2_id: z.string().uuid().nullable().optional(),

  // Required Story Content
  couple_names: z
    .string()
    .min(5, 'Couple names must be at least 5 characters')
    .max(100, 'Couple names must not exceed 100 characters')
    .trim(),

  location: z
    .string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location must not exceed 100 characters')
    .trim(),

  story_text: z
    .string()
    .min(50, 'Story must be at least 50 characters')
    .max(1000, 'Story must not exceed 1000 characters')
    .trim(),

  // Media (optional)
  couple_photo_url: z.string().url('Invalid photo URL').nullable().optional(),

  wedding_photos: z
    .array(z.string().url('Invalid wedding photo URL'))
    .max(5, 'Maximum 5 wedding photos allowed')
    .nullable()
    .optional(),

  marriage_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),

  // Display Controls
  is_featured: z.boolean().optional().default(false),
  is_published: z.boolean().optional().default(false),
  display_order: z.number().int().min(0).optional().default(0),

  // Workflow (for admin use)
  submission_type: z.enum(['admin', 'user_submitted']).optional().default('admin'),
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('approved'),
})

/**
 * User submission schema (restricted fields)
 * Users can only submit stories for approval
 */
export const userSuccessStorySubmissionSchema = z.object({
  profile1_id: z.string().uuid().nullable().optional(),
  profile2_id: z.string().uuid().nullable().optional(),
  couple_names: z
    .string()
    .min(5, 'Couple names must be at least 5 characters')
    .max(100, 'Couple names must not exceed 100 characters')
    .trim(),
  location: z
    .string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location must not exceed 100 characters')
    .trim(),
  story_text: z
    .string()
    .min(50, 'Story must be at least 50 characters')
    .max(1000, 'Story must not exceed 1000 characters')
    .trim(),
  couple_photo_url: z.string().url('Invalid photo URL').nullable().optional(),
  wedding_photos: z
    .array(z.string().url('Invalid wedding photo URL'))
    .max(5, 'Maximum 5 wedding photos allowed')
    .nullable()
    .optional(),
  marriage_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
})

/**
 * Admin update schema (can modify all fields)
 */
export const adminSuccessStoryUpdateSchema = successStorySchema.partial().extend({
  id: z.string().uuid(),
})

/**
 * Status update schema (for approval/rejection)
 */
export const statusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected']),
  approved_by: z.string().uuid().optional(),
})

/**
 * Featured/Published toggle schema
 */
export const toggleSchema = z.object({
  id: z.string().uuid(),
  field: z.enum(['is_featured', 'is_published']),
  value: z.boolean(),
})

/**
 * Display order update schema
 */
export const displayOrderUpdateSchema = z.object({
  id: z.string().uuid(),
  display_order: z.number().int().min(0),
})

// Type exports for use in components
export type SuccessStory = z.infer<typeof successStorySchema>
export type UserSuccessStorySubmission = z.infer<typeof userSuccessStorySubmissionSchema>
export type AdminSuccessStoryUpdate = z.infer<typeof adminSuccessStoryUpdateSchema>
export type StatusUpdate = z.infer<typeof statusUpdateSchema>
export type Toggle = z.infer<typeof toggleSchema>
export type DisplayOrderUpdate = z.infer<typeof displayOrderUpdateSchema>
