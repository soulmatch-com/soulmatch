import { z } from 'zod'
import { compareDateOnlyStrings, getAlternativeDateConflictMessage, getCelebrationDateBounds, isValidDateOnly } from './date.ts'
import { indianMobileSchema, optionalBirthDateSchema, optionalPersonName, requiredLocation, requiredPersonName, requiredRelationship } from './enquiry-validation.ts'
import { preferredContactMethods } from '../validations/celebration-enquiry-api.schema.ts'

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined)
const dateString = z
  .string({ error: 'Please select a preferred ceremony date.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format')
  .refine((value) => isValidDateOnly(value), 'Use a valid calendar date')
const optionalDate = dateString.optional().or(z.literal('')).transform((value) => value || undefined)

export function createPlanV2DetailsSchema(referenceDate = new Date()) {
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
    preferredDate,
    alternativeDate,
    travellingFrom: requiredLocation(),
    additionalRequirements: optionalText(1000),
    husbandName: optionalPersonName('Husband name'),
    wifeName: optionalPersonName('Wife name'),
    husbandDob: optionalBirthDateSchema('Husband', today, minDateOfBirth, maxDateOfBirth),
    wifeDob: optionalBirthDateSchema('Wife', today, minDateOfBirth, maxDateOfBirth),
    husbandNakshatra: optionalText(100),
    husbandRasi: optionalText(100),
    wifeNakshatra: optionalText(100),
    wifeRasi: optionalText(100),
    contactName: requiredPersonName('Contact name'),
    mobile: indianMobileSchema,
    email: z.string().trim().email('Enter a valid email').max(320).optional().or(z.literal('')).transform((value) => value || undefined),
    relationship: requiredRelationship,
    preferredContactMethod: z.enum(preferredContactMethods, { error: 'Please select a preferred contact method.' }),
    termsPrivacyAcknowledged: z.literal(true, { error: 'Please agree to the Terms & Conditions and acknowledge the Privacy Policy before continuing.' }),
  }).strict().superRefine((data, context) => {
    const alternativeDateConflict = getAlternativeDateConflictMessage(data.preferredDate, data.alternativeDate ?? '', today)
    if (alternativeDateConflict) {
      context.addIssue({ code: 'custom', path: ['alternativeDate'], message: alternativeDateConflict })
    }
    if (data.preferredContactMethod === 'email' && !data.email) {
      context.addIssue({ code: 'custom', path: ['email'], message: 'Email is required when email is your preferred contact method' })
    }
  })
}

export const planV2DetailsSchema = createPlanV2DetailsSchema()
export type CelebrationPlanDetailsInput = z.input<typeof planV2DetailsSchema>
export type CelebrationPlanDetails = z.output<typeof planV2DetailsSchema>
export type CelebrationPlanDetailsDraft = Omit<CelebrationPlanDetailsInput, 'termsPrivacyAcknowledged'> & {
  termsPrivacyAcknowledged?: boolean
}
