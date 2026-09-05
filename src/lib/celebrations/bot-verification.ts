import 'server-only'

import { verifyTurnstileToken, type BotVerificationResult } from './bot-verification-core'

export type CelebrationBotVerificationResult = BotVerificationResult | { status: 'misconfigured' }

export async function verifyCelebrationBotChallenge(token: string | null): Promise<CelebrationBotVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return { status: 'valid' }
    console.error('Celebration bot verification is not configured')
    return { status: 'misconfigured' }
  }

  const allowedHostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean)

  const result = await verifyTurnstileToken({ token: token ?? '', secret, allowedHostnames })
  if (result.status === 'unavailable') console.error('Celebration bot verification is unavailable')
  return result
}
