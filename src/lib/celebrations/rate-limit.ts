import 'server-only'

import type { NextRequest } from 'next/server'
import { checkSharedCelebrationRateLimit, hashRateLimitIdentifier, type CelebrationRateLimitResult } from './rate-limit-core'

type RouteRateLimitResult = CelebrationRateLimitResult | { allowed: false; unavailable: true }

function getClientNetworkIdentifier(request: NextRequest) {
  const forwarded = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown-network'
}

export async function checkCelebrationEnquiryRateLimit(request: NextRequest): Promise<RouteRateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const salt = process.env.CELEBRATION_RATE_LIMIT_SALT
  if (!url || !token || !salt) {
    if (process.env.NODE_ENV !== 'production') return { allowed: true }
    console.error('Celebration enquiry rate limiter is not configured')
    return { allowed: false, unavailable: true }
  }
  const identifier = hashRateLimitIdentifier(getClientNetworkIdentifier(request), salt)
  try {
    return await checkSharedCelebrationRateLimit({ url, token, key: `celebration-enquiry:${identifier}` })
  } catch {
    console.error('Celebration enquiry rate limiter is unavailable')
    return { allowed: true }
  }
}
