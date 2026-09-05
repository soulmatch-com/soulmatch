import { z } from 'zod'

export const celebrationTypes = ['60th-marriage', '70th-marriage', '80th-marriage', 'not-sure'] as const
export const guestCountRanges = ['below-20', '20-50', '51-100', '100-plus'] as const
export const arrangementPreferences = ['ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance'] as const
export const preferredContactMethods = ['phone', 'whatsapp', 'email'] as const

const today = () => new Date().toISOString().slice(0, 10)
const requiredText = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined)
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format').refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}, 'Use a valid calendar date')
const optionalDate = dateString.optional().or(z.literal('')).transform((value) => value || undefined)
const birthDate = dateString.refine((value) => value <= today(), 'Date of birth cannot be in the future')

export const celebrationEnquiryApiSchema = z.object({
  celebrationType: z.enum(celebrationTypes, { error: 'Please select the ceremony.' }),
  husbandName: requiredText('Husband name', 150),
  wifeName: requiredText('Wife name', 150),
  husbandDob: birthDate,
  wifeDob: birthDate,
  husbandNakshatra: optionalText(100),
  wifeNakshatra: optionalText(100),
  husbandRasi: optionalText(100),
  wifeRasi: optionalText(100),
  preferredDate: dateString,
  alternativeDate: optionalDate,
  guestCountRange: z.enum(guestCountRanges, { error: 'Please select the number of guests.' }),
  travellingFrom: requiredText('Travelling from', 200),
  arrangementPreference: z.enum(arrangementPreferences, { error: 'Please select an arrangement preference.' }),
  contactName: requiredText('Contact name', 150),
  mobile: requiredText('Mobile number', 30)
    .regex(/^\+?[0-9][0-9\s().-]*$/, 'Enter a valid mobile number')
    .refine((value) => value.replace(/\D/g, '').length >= 7, 'Enter a valid mobile number'),
  email: z.string().trim().email('Enter a valid email').max(320).optional().or(z.literal('')).transform((value) => value || undefined),
  relationship: requiredText('Relationship', 100),
  preferredContactMethod: z.enum(preferredContactMethods, { error: 'Please select a preferred contact method.' }),
  serviceIds: z.array(z.string().uuid('Every service ID must be a valid UUID')).max(20, 'Too many services selected').transform((ids) => [...new Set(ids)]),
  otherServiceDetails: optionalText(1000),
  notes: optionalText(2000),
}).strict().superRefine((data, context) => {
  if (data.alternativeDate && data.alternativeDate === data.preferredDate) {
    context.addIssue({ code: 'custom', path: ['alternativeDate'], message: 'Alternative date must differ from preferred date' })
  }
  if (data.serviceIds.length === 0 && data.arrangementPreference !== 'need-guidance') {
    context.addIssue({ code: 'custom', path: ['serviceIds'], message: 'Select at least one service unless guidance is requested' })
  }
  if (data.preferredContactMethod === 'email' && !data.email) {
    context.addIssue({ code: 'custom', path: ['email'], message: 'Email is required when email is your preferred contact method' })
  }
})

export type CelebrationEnquiryApiInput = z.infer<typeof celebrationEnquiryApiSchema>
export type CelebrationEnquiryFormValues = z.input<typeof celebrationEnquiryApiSchema>
