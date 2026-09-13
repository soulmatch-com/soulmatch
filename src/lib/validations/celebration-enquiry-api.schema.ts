import { z } from 'zod'
import { compareDateOnlyStrings, getAlternativeDateConflictMessage, getCelebrationDateBounds, isValidDateOnly } from '@/lib/celebrations/date'

export const celebrationTypes = ['60th-marriage', '70th-marriage', '80th-marriage', 'not-sure'] as const
export const guestCountRanges = ['below-20', '20-50', '51-100', '100-plus'] as const
export const arrangementPreferences = ['ceremony-only', 'ceremony-food', 'ceremony-stay', 'complete-arrangement', 'need-guidance'] as const
export const preferredContactMethods = ['phone', 'whatsapp', 'email'] as const

const requiredText = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined)
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format')
  .refine((value) => isValidDateOnly(value), 'Use a valid calendar date')
const optionalDate = dateString.optional().or(z.literal('')).transform((value) => value || undefined)

function buildBirthDateSchema(label: 'Husband' | 'Wife', today: string, minDateOfBirth: string, maxDateOfBirth: string) {
  return dateString.superRefine((value, context) => {
    if (compareDateOnlyStrings(value, today) >= 0) {
      context.addIssue({ code: 'custom', message: 'Date of birth cannot be in the future.' })
      return
    }
    if (compareDateOnlyStrings(value, maxDateOfBirth) > 0) {
      context.addIssue({ code: 'custom', message: `${label} must be at least 18 years old.` })
      return
    }
    if (compareDateOnlyStrings(value, minDateOfBirth) < 0) {
      context.addIssue({ code: 'custom', message: 'Please enter a valid date of birth.' })
    }
  })
}

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
    husbandName: requiredText('Husband name', 150),
    wifeName: requiredText('Wife name', 150),
    husbandDob: buildBirthDateSchema('Husband', today, minDateOfBirth, maxDateOfBirth),
    wifeDob: buildBirthDateSchema('Wife', today, minDateOfBirth, maxDateOfBirth),
    husbandNakshatra: optionalText(100),
    wifeNakshatra: optionalText(100),
    husbandRasi: optionalText(100),
    wifeRasi: optionalText(100),
    preferredDate,
    alternativeDate,
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
