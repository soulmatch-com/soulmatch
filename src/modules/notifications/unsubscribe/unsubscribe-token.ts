import { createHmac, timingSafeEqual } from 'node:crypto'
import type { UnsubscribeTokenPayload } from './unsubscribe-types.ts'

const VERSION = 'v1'
const purpose = (subscriberId: string) => `unsubscribe:${VERSION}:${subscriberId}`

function signature(subscriberId: string, secret: string) {
  return createHmac('sha256', secret).update(purpose(subscriberId)).digest('base64url')
}

export function createUnsubscribeToken(subscriberId: string, secret = process.env.NOTIFICATION_UNSUBSCRIBE_SECRET) {
  if (!secret) throw new Error('Unsubscribe signing is not configured.')
  if (!/^[0-9a-f-]{36}$/i.test(subscriberId)) throw new Error('Subscriber identifier is invalid.')
  return `${VERSION}.${subscriberId}.${signature(subscriberId, secret)}`
}

export function verifyUnsubscribeToken(token: string, secret = process.env.NOTIFICATION_UNSUBSCRIBE_SECRET): UnsubscribeTokenPayload | null {
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION || !/^[0-9a-f-]{36}$/i.test(parts[1])) return null
  const expected = Buffer.from(signature(parts[1], secret))
  const received = Buffer.from(parts[2])
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  return { subscriberId: parts[1] }
}
