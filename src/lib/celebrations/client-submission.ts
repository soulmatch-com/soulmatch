import type { CelebrationEnquiryApiInput } from '../validations/celebration-enquiry-api.schema.ts'

interface ApiResponse { success?: boolean; enquiryId?: string; enquiryReference?: string; message?: string; errors?: Record<string, string[]> }
export type EnquirySubmissionResult =
  | { ok: true; enquiryId: string; enquiryReference: string }
  | { ok: false; kind: 'validation'; errors: Record<string, string[]> }
  | { ok: false; kind: 'too-large' | 'rate-limited' | 'challenge' | 'verification-unavailable' | 'server' | 'network' | 'invalid-response' }

export async function submitCelebrationEnquiry(values: CelebrationEnquiryApiInput, botTokenOrRequest?: string | typeof fetch, request: typeof fetch = fetch): Promise<EnquirySubmissionResult> {
  try {
    const botToken = typeof botTokenOrRequest === 'string' ? botTokenOrRequest : undefined
    if (typeof botTokenOrRequest === 'function') request = botTokenOrRequest
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (botToken) headers['X-Celebration-Bot-Token'] = botToken
    const response = await request('/api/celebrations/enquiries', { method: 'POST', headers, body: JSON.stringify(values) })
    const result = await response.json().catch(() => ({})) as ApiResponse
    if (response.status === 400) return { ok: false, kind: 'validation', errors: result.errors ?? {} }
    if (response.status === 413) return { ok: false, kind: 'too-large' }
    if (response.status === 429) return { ok: false, kind: 'rate-limited' }
    if (response.status === 403) return { ok: false, kind: 'challenge' }
    if (response.status === 503) return { ok: false, kind: 'verification-unavailable' }
    if (!response.ok) return { ok: false, kind: 'server' }
    if (!result.success || !result.enquiryId || !result.enquiryReference) return { ok: false, kind: 'invalid-response' }
    return { ok: true, enquiryId: result.enquiryId, enquiryReference: result.enquiryReference }
  } catch {
    return { ok: false, kind: 'network' }
  }
}
