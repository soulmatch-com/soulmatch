import { createHmac } from 'node:crypto'

export const CELEBRATION_RATE_LIMIT_CAPACITY = 5
export const CELEBRATION_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

const TOKEN_BUCKET_SCRIPT = `
local capacity = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now_parts = redis.call('TIME')
local now_ms = (tonumber(now_parts[1]) * 1000) + math.floor(tonumber(now_parts[2]) / 1000)
local state = redis.call('HMGET', KEYS[1], 'tokens', 'updated_at')
local tokens = tonumber(state[1]) or capacity
local updated_at = tonumber(state[2]) or now_ms
local elapsed = math.max(0, now_ms - updated_at)
tokens = math.min(capacity, tokens + (elapsed * capacity / window_ms))
local allowed = 0
local retry_after = 0
if tokens >= 1 then
  allowed = 1
  tokens = tokens - 1
else
  retry_after = math.ceil(((1 - tokens) * window_ms / capacity) / 1000)
end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'updated_at', now_ms)
redis.call('PEXPIRE', KEYS[1], window_ms * 2)
return { allowed, math.floor(tokens), retry_after }
`

export type CelebrationRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

interface RateLimitStoreConfig { url: string; token: string; key: string; request?: typeof fetch }

export function hashRateLimitIdentifier(identifier: string, salt: string) {
  return createHmac('sha256', salt).update(identifier).digest('hex')
}

export async function checkSharedCelebrationRateLimit({ url, token, key, request = fetch }: RateLimitStoreConfig): Promise<CelebrationRateLimitResult> {
  const response = await request(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(['EVAL', TOKEN_BUCKET_SCRIPT, '1', key, String(CELEBRATION_RATE_LIMIT_CAPACITY), String(CELEBRATION_RATE_LIMIT_WINDOW_MS)]),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Rate-limit store request failed')
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || !('result' in payload) || !Array.isArray(payload.result) || payload.result.length < 3) {
    throw new Error('Rate-limit store returned an invalid response')
  }
  if (Number(payload.result[0]) === 1) return { allowed: true }
  return { allowed: false, retryAfterSeconds: Math.max(1, Number(payload.result[2]) || 120) }
}
