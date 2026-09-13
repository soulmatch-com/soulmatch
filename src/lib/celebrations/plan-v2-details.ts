import { z } from 'zod'
import { compareDateOnlyStrings, getAlternativeDateConflictMessage, getCelebrationDateBounds, isValidDateOnly } from './date.ts'
import { preferredContactMethods } from '../validations/celebration-enquiry-api.schema.ts'

const requiredText = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined)
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format')
  .refine((value) => isValidDateOnly(value), 'Use a valid calendar date')
const optionalDate = dateString.optional().or(z.literal('')).transform((value) => value || undefined)

function buildPlanV2BirthDateSchema(label: 'Husband' | 'Wife', today: string, minDateOfBirth: string, maxDateOfBirth: string) {
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
    travellingFrom: requiredText('Travelling from', 200),
    additionalRequirements: optionalText(1000),
    husbandName: requiredText('Husband name', 150),
    wifeName: requiredText('Wife name', 150),
    husbandDob: buildPlanV2BirthDateSchema('Husband', today, minDateOfBirth, maxDateOfBirth),
    wifeDob: buildPlanV2BirthDateSchema('Wife', today, minDateOfBirth, maxDateOfBirth),
    husbandNakshatra: optionalText(100),
    husbandRasi: optionalText(100),
    wifeNakshatra: optionalText(100),
    wifeRasi: optionalText(100),
    contactName: requiredText('Contact name', 150),
    mobile: requiredText('Mobile number', 30)
      .regex(/^\+?[0-9][0-9\s().-]*$/, 'Enter a valid mobile number')
      .refine((value) => value.replace(/\D/g, '').length >= 7, 'Enter a valid mobile number'),
    email: z.string().trim().email('Enter a valid email').max(320).optional().or(z.literal('')).transform((value) => value || undefined),
    relationship: requiredText('Relationship', 100),
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
