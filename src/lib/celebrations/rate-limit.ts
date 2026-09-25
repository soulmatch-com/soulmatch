import 'server-only'

import type { NextRequest } from 'next/server'
import { checkRouteRateLimit, type RouteRateLimitResult } from '@/lib/rate-limit'

export async function checkCelebrationEnquiryRateLimit(request: NextRequest): Promise<RouteRateLimitResult> {
  return checkRouteRateLimit(request, {
    keyPrefix: 'celebration-enquiry',
    capacity: 5,
    windowMs: 10 * 60 * 1000,
    saltEnvironmentVariable: 'CELEBRATION_RATE_LIMIT_SALT',
    unavailableMessage: 'Celebration enquiry rate limiter',
  })
}
