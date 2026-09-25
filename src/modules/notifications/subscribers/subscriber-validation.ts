import { z } from 'zod'
import { subscriberConsentSources, subscriberLocales } from './subscriber-types.ts'

export const subscribeRequestSchema = z.object({
  email: z.string({ error: 'Email is required.' }).trim().email('Enter a valid email address.').max(320, 'Email is too long.').transform((email) => email.toLowerCase()),
  consent: z.literal(true, { error: 'Consent is required to subscribe.' }),
  locale: z.enum(subscriberLocales, { error: 'Choose English or Tamil.' }),
  source: z.enum(subscriberConsentSources, { error: 'Unsupported subscription source.' }),
}).strict()

export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>
