import 'server-only'

import type { NextRequest } from 'next/server'
import { checkSharedRateLimit, hashRateLimitIdentifier, type RateLimitResult } from './rate-limit-core'

export type RouteRateLimitResult = RateLimitResult | { allowed: false; unavailable: true }

type RouteRateLimitConfig = {
  keyPrefix: string
  capacity: number
  windowMs: number
  saltEnvironmentVariable: string
  unavailableMessage: string
}

export function getClientNetworkIdentifier(request: NextRequest) {
  const forwarded = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown-network'
}

export async function checkRouteRateLimit(request: NextRequest, config: RouteRateLimitConfig): Promise<RouteRateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const salt = process.env[config.saltEnvironmentVariable]
  if (!url || !token || !salt) {
    if (process.env.NODE_ENV !== 'production') return { allowed: true }
    console.error(`${config.unavailableMessage} is not configured`)
    return { allowed: false, unavailable: true }
  }

  const identifier = hashRateLimitIdentifier(getClientNetworkIdentifier(request), salt)
  try {
    return await checkSharedRateLimit({ url, token, key: `${config.keyPrefix}:${identifier}`, capacity: config.capacity, windowMs: config.windowMs })
  } catch {
    // Preserve the established route policy: configuration failures fail closed in
    // production, while a transient configured-store outage remains available.
    console.error(`${config.unavailableMessage} is unavailable`)
    return { allowed: true }
  }
}
