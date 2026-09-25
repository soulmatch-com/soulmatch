export const subscriberLocales = ['en', 'ta'] as const
export type SubscriberLocale = (typeof subscriberLocales)[number]

export const subscriberConsentSources = ['blog_listing', 'blog_article'] as const
export type SubscriberConsentSource = (typeof subscriberConsentSources)[number]

export const subscriberStatuses = ['subscribed', 'unsubscribed'] as const
export type SubscriberStatus = (typeof subscriberStatuses)[number]

export interface EmailSubscriber {
  id: string
  email: string
  preferredLocale: SubscriberLocale | null
  status: SubscriberStatus
  consentSource: SubscriberConsentSource
  consentedAt: string
  unsubscribedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscribeInput {
  email: string
  locale: SubscriberLocale
  source: SubscriberConsentSource
}

export type SubscribeResult =
  | { status: 'subscribed' }
  | { status: 'already_subscribed' }
  | { status: 'resubscribed' }

/** Internal control-flow error used to make unique-email races idempotent. */
export class DuplicateSubscriberError extends Error {}
