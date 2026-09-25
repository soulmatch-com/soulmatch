import type { EmailProvider, EmailMessage, EmailSendResult } from './email-provider.ts'

type ResendConfig = { apiKey?: string; from?: string; request?: typeof fetch }

export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey?: string
  private readonly from?: string
  private readonly request: typeof fetch

  constructor({ apiKey = process.env.RESEND_API_KEY, from = process.env.NOTIFICATION_EMAIL_FROM, request = fetch }: ResendConfig = {}) {
    this.apiKey = apiKey
    this.from = from
    this.request = request
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from || this.from
    if (!this.apiKey || !from) return { status: 'failed', retryable: false, errorCode: 'provider_not_configured' }
    try {
      const response = await this.request('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json', 'idempotency-key': message.idempotencyKey },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text, ...(message.replyTo ? { reply_to: message.replyTo } : {}) }),
      })
      if (response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const providerMessageId = body && typeof body === 'object' && 'id' in body && typeof body.id === 'string' ? body.id : null
        return { status: 'accepted', providerMessageId }
      }
      if (response.status === 429) return { status: 'failed', retryable: true, errorCode: 'rate_limited' }
      if (response.status >= 500) return { status: 'failed', retryable: true, errorCode: 'server_error' }
      if (response.status === 400) return { status: 'failed', retryable: false, errorCode: 'invalid_request' }
      if (response.status === 422) return { status: 'failed', retryable: false, errorCode: 'invalid_recipient' }
      return { status: 'failed', retryable: true, errorCode: 'provider_unavailable' }
    } catch (error) {
      return { status: 'failed', retryable: true, errorCode: error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'provider_unavailable' }
    }
  }
}
