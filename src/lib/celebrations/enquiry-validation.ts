import { z } from 'zod'
import { compareDateOnlyStrings, isValidDateOnly } from './date.ts'

const unicodeNamePattern = /^[\p{L}\p{M}]+(?: [\p{L}\p{M}]+)*$/u
const locationPattern = /^[\p{L}\p{M}\s,.'()\-]+$/u
const mobileInputPattern = /^\+?[0-9\s().-]+$/
const indianMobilePattern = /^[6-9]\d{9}$/

export function requiredPersonName(label: string) {
  return z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(50, 'Name must be 50 characters or fewer.')
    .regex(unicodeNamePattern, 'Enter a valid name using letters only.')
}

export function optionalPersonName(label: string) {
  return z.string().trim().max(50, `${label} must be 50 characters or fewer.`)
    .refine((value) => !value || unicodeNamePattern.test(value), 'Enter a valid name using letters only.')
    .transform((value) => value || undefined)
    .optional()
    .transform((value) => value || undefined)
}

export function sanitizePersonNameInput(value: string): string {
  return value.replace(/[^\p{L}\p{M} ]/gu, '').replace(/ +/g, ' ')
}

export function requiredLocation() {
  return z.string({ error: 'Travelling From is required.' }).trim()
    .min(2, 'Enter a valid city or location.')
    .max(50, 'Travelling From must be 50 characters or fewer.')
    .regex(locationPattern, 'Enter a valid city or location.')
    .refine((value) => /\p{L}/u.test(value), 'Enter a valid city or location.')
}

export function sanitizeLocationInput(value: string): string {
  return value.replace(/[^\p{L}\p{M} ,.'()\-]/gu, '').replace(/ +/g, ' ')
}

export const requiredRelationship = z.string({ error: 'Please select your relationship to the couple.' }).trim()
  .min(1, 'Please select your relationship to the couple.')
  .max(100, 'Please select your relationship to the couple.')

export function normalizeIndianMobile(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed || !mobileInputPattern.test(trimmed)) return undefined
  const digits = trimmed.replace(/[\s().-]/g, '').replace(/^\+/, '')
  const mobile = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits
  return indianMobilePattern.test(mobile) ? mobile : undefined
}

export function sanitizeIndianMobileInput(value: string): string {
  const supported = value.replace(/[^0-9+\s().-]/g, '')
  return supported.startsWith('+') ? `+${supported.slice(1).replace(/\+/g, '')}` : supported.replace(/\+/g, '')
}

export const indianMobileSchema = z.string({ error: 'Mobile number is required.' }).trim().min(1, 'Mobile number is required.')
  .max(15, 'Enter a valid 10-digit mobile number.')
  .refine((value) => normalizeIndianMobile(value) !== undefined, 'Enter a valid 10-digit mobile number.')
  .transform((value) => normalizeIndianMobile(value)!)

const dateString = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date in YYYY-MM-DD format')
  .refine((value) => isValidDateOnly(value), 'Use a valid calendar date')

export function optionalBirthDateSchema(label: 'Husband' | 'Wife', today: string, minDateOfBirth: string, maxDateOfBirth: string) {
  return dateString.optional().or(z.literal('')).transform((value) => value || undefined).superRefine((value, context) => {
    if (!value) return
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
