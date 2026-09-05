export const CELEBRATION_BOT_TOKEN_HEADER = 'x-celebration-bot-token'
export const CELEBRATION_TURNSTILE_ACTION = 'celebration_enquiry'
export const MAX_TURNSTILE_TOKEN_LENGTH = 2048
export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type BotVerificationResult =
  | { status: 'valid' }
  | { status: 'invalid' }
  | { status: 'unavailable' }

interface VerifyOptions {
  token: string
  secret: string
  allowedHostnames?: string[]
  request?: typeof fetch
}

interface SiteverifyResponse {
  success?: boolean
  action?: string
  hostname?: string
}

export async function verifyTurnstileToken({ token, secret, allowedHostnames = [], request = fetch }: VerifyOptions): Promise<BotVerificationResult> {
  const normalizedToken = token.trim()
  if (!normalizedToken || normalizedToken.length > MAX_TURNSTILE_TOKEN_LENGTH) return { status: 'invalid' }

  try {
    const response = await request(TURNSTILE_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: normalizedToken }),
      cache: 'no-store',
    })
    if (!response.ok) return { status: 'unavailable' }
    const result = await response.json() as SiteverifyResponse
    if (!result.success || result.action !== CELEBRATION_TURNSTILE_ACTION) return { status: 'invalid' }
    if (allowedHostnames.length > 0 && (!result.hostname || !allowedHostnames.includes(result.hostname))) return { status: 'invalid' }
    return { status: 'valid' }
  } catch {
    return { status: 'unavailable' }
  }
}
