import { z } from 'zod'
import { compareDateOnlyStrings, getAlternativeDateConflictMessage, getCelebrationDateBounds, isValidDateOnly } from '../celebrations/date.ts'
import { indianMobileSchema, optionalBirthDateSchema, optionalPersonName, requiredLocation, requiredPersonName, requiredRelationship } from '../celebrations/enquiry-validation.ts'

export const celebrationTypes = ['60th-marriage', '70th-marriage', '80th-marriage', 'not-sure'] as const
export const guestCountRanges = ['below-20', '20-50', '51-100', '100-plus'] as const
export const arrangementPreferences = ['ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance'] as const
export const preferredContactMethods = ['phone', 'whatsapp', 'email'] as const
export const planTypes = ['basic', 'premium'] as const
export const ceremonyDurations = ['one_session', 'two_sessions'] as const

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined)
const dateString = z
  .string({ error: 'Please select a preferred ceremony date.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format')
  .refine((value) => isValidDateOnly(value), 'Use a valid calendar date')
const optionalDate = dateString.optional().or(z.literal('')).transform((value) => value || undefined)

export function createCelebrationEnquiryApiSchema(referenceDate = new Date()) {
  const { today, minDateOfBirth, maxDateOfBirth } = getCelebrationDateBounds(referenceDate)
  const preferredDate = dateString.refine(
    (value) => compareDateOnlyStrings(value, today) >= 0,
    'Preferred date cannot be in the past.'
  )
  const alternativeDate = optionalDate.refine(
    (value) => !value || compareDateOnlyStrings(value, today) >= 0,
    'Alternative date cannot be in the past.'
  )

  return z.object({
    celebrationType: z.enum(celebrationTypes, { error: 'Please select the ceremony.' }),
    husbandName: optionalPersonName('Husband name'),
    wifeName: optionalPersonName('Wife name'),
    husbandDob: optionalBirthDateSchema('Husband', today, minDateOfBirth, maxDateOfBirth),
    wifeDob: optionalBirthDateSchema('Wife', today, minDateOfBirth, maxDateOfBirth),
    husbandNakshatra: optionalText(100),
    wifeNakshatra: optionalText(100),
    husbandRasi: optionalText(100),
    wifeRasi: optionalText(100),
    preferredDate,
    alternativeDate,
    guestCountRange: z.enum(guestCountRanges, { error: 'Please select the number of guests.' }),
    travellingFrom: requiredLocation(),
    arrangementPreference: z.enum(arrangementPreferences, { error: 'Please select an arrangement preference.' }),
    contactName: requiredPersonName('Contact name'),
    mobile: indianMobileSchema,
    email: z.string().trim().email('Enter a valid email').max(320).optional().or(z.literal('')).transform((value) => value || undefined),
    relationship: requiredRelationship,
    preferredContactMethod: z.enum(preferredContactMethods, { error: 'Please select a preferred contact method.' }),
    serviceIds: z.array(z.string().uuid('Every service ID must be a valid UUID')).max(20, 'Too many services selected').transform((ids) => [...new Set(ids)]),
    otherServiceDetails: optionalText(1000),
    notes: optionalText(2000),
    expectedGuestCount: z.number().int().min(1).max(1000).optional(),
    ceremonyDuration: z.enum(ceremonyDurations).optional(),
    planType: z.enum(planTypes).optional(),
    planVersion: z.number().int().min(1).max(100).optional(),
    specialRequirements: optionalText(1000),
  }).strict().superRefine((data, context) => {
    const alternativeDateConflict = getAlternativeDateConflictMessage(data.preferredDate, data.alternativeDate ?? '', today)
    if (alternativeDateConflict) {
      context.addIssue({ code: 'custom', path: ['alternativeDate'], message: alternativeDateConflict })
    }
    if (data.serviceIds.length === 0 && data.arrangementPreference !== 'need-guidance') {
      context.addIssue({ code: 'custom', path: ['serviceIds'], message: 'Select at least one service unless guidance is requested' })
    }
    if (data.preferredContactMethod === 'email' && !data.email) {
      context.addIssue({ code: 'custom', path: ['email'], message: 'Email is required when email is your preferred contact method' })
    }
  })
}

export const celebrationEnquiryApiSchema = createCelebrationEnquiryApiSchema()

export type CelebrationEnquiryApiInput = z.infer<typeof celebrationEnquiryApiSchema>
export type CelebrationEnquiryFormValues = z.input<typeof celebrationEnquiryApiSchema>
