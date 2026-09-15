import { z } from 'zod'

export const celebrationEnquiryStatuses = ['pending', 'contacted', 'confirmed', 'cancelled'] as const

export const celebrationEnquiryStatusUpdateSchema = z.object({
  enquiryId: z.string().uuid('Enquiry ID must be a valid UUID'),
  status: z.enum(celebrationEnquiryStatuses, { error: 'Invalid status' }),
  remarks: z.string().trim().min(1, 'Remarks are required').max(1000, 'Remarks must be 1000 characters or fewer'),
}).strict()

export type CelebrationEnquiryStatus = typeof celebrationEnquiryStatuses[number]
export type CelebrationEnquiryStatusUpdateInput = z.infer<typeof celebrationEnquiryStatusUpdateSchema>
