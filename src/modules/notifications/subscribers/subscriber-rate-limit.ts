import 'server-only'

import type { NextRequest } from 'next/server'
import { checkRouteRateLimit, type RouteRateLimitResult } from '@/lib/rate-limit'

export const SUBSCRIBER_RATE_LIMIT_CAPACITY = 3
export const SUBSCRIBER_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

export function checkSubscriberRateLimit(request: NextRequest): Promise<RouteRateLimitResult> {
  return checkRouteRateLimit(request, {
    keyPrefix: 'notification-subscriber',
    capacity: SUBSCRIBER_RATE_LIMIT_CAPACITY,
    windowMs: SUBSCRIBER_RATE_LIMIT_WINDOW_MS,
    saltEnvironmentVariable: 'NOTIFICATION_SUBSCRIBER_RATE_LIMIT_SALT',
    unavailableMessage: 'Notification subscriber rate limiter',
  })
}
