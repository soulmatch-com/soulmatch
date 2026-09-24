export const CELEBRATION_RATE_LIMIT_CAPACITY = 5
export const CELEBRATION_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
import { checkSharedRateLimit, hashRateLimitIdentifier, type RateLimitResult } from '../rate-limit-core.ts'

export type CelebrationRateLimitResult = RateLimitResult
export { hashRateLimitIdentifier }

export function checkSharedCelebrationRateLimit({ url, token, key, request }: { url: string; token: string; key: string; request?: typeof fetch }) {
  return checkSharedRateLimit({ url, token, key, capacity: CELEBRATION_RATE_LIMIT_CAPACITY, windowMs: CELEBRATION_RATE_LIMIT_WINDOW_MS, request })
}
