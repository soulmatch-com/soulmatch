import type { EmailMessage, EmailProvider, EmailSendResult } from './email-provider.ts'

type GmailApiConfig = {
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  from?: string
  request?: typeof fetch
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function senderAddress(value: string) {
  const match = cleanHeader(value).match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>$/)
  const address = match?.[1] ?? cleanHeader(value)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) throw new Error('Gmail sender configuration is invalid')
  return address
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(cleanHeader(value), 'utf8').toString('base64')}?=`
}

function createRawMessage(message: EmailMessage, from: string) {
  const boundary = `notification-${message.idempotencyKey}`
  const sender = senderAddress(from)
  const mime = [
    `From: ${encodeHeader(from)}`,
    `Reply-To: ${sender}`,
    `To: ${cleanHeader(message.to)}`,
    `Subject: ${encodeHeader(message.subject)}`,
    `Message-ID: <notification-${message.idempotencyKey}@${sender.split('@')[1]}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    `--${boundary}--`,
  ].join('\r\n')
  return Buffer.from(mime, 'utf8').toString('base64url')
}

function failureForStatus(status: number): EmailSendResult {
  if (status === 429) return { status: 'failed', retryable: true, errorCode: 'rate_limited' }
  if (status >= 500) return { status: 'failed', retryable: true, errorCode: 'server_error' }
  if (status === 400 || status === 401 || status === 403) return { status: 'failed', retryable: false, errorCode: 'invalid_request' }
  return { status: 'failed', retryable: true, errorCode: 'provider_unavailable' }
}

export class GmailApiEmailProvider implements EmailProvider {
  private readonly clientId?: string
  private readonly clientSecret?: string
  private readonly refreshToken?: string
  private readonly from?: string
  private readonly request: typeof fetch

  constructor({
    clientId = process.env.NOTIFICATION_GMAIL_OAUTH_CLIENT_ID ?? process.env.GMAIL_OAUTH_CLIENT_ID,
    clientSecret = process.env.NOTIFICATION_GMAIL_OAUTH_CLIENT_SECRET ?? process.env.GMAIL_OAUTH_CLIENT_SECRET,
    refreshToken = process.env.NOTIFICATION_GMAIL_OAUTH_REFRESH_TOKEN ?? process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    from = process.env.NOTIFICATION_EMAIL_FROM,
    request = fetch,
  }: GmailApiConfig = {}) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.refreshToken = refreshToken
    this.from = from
    this.request = request
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const from = message.from || this.from
    if (!this.clientId || !this.clientSecret || !this.refreshToken || !from) return { status: 'failed', retryable: false, errorCode: 'provider_not_configured' }
    try {
      const tokenResponse = await this.request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, refresh_token: this.refreshToken, grant_type: 'refresh_token' }),
      })
      if (!tokenResponse.ok) {
        console.error('Gmail OAuth token refresh failed', { status: tokenResponse.status })
        return failureForStatus(tokenResponse.status)
      }
      const token = await tokenResponse.json().catch(() => null) as { access_token?: unknown } | null
      if (!token || typeof token.access_token !== 'string' || !token.access_token) return { status: 'failed', retryable: false, errorCode: 'invalid_request' }
      const response = await this.request('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: createRawMessage(message, from) }),
      })
      if (!response.ok) {
        console.error('Gmail email request failed', { status: response.status })
        return failureForStatus(response.status)
      }
      const result = await response.json().catch(() => null) as { id?: unknown } | null
      return { status: 'accepted', providerMessageId: result && typeof result.id === 'string' ? result.id : null }
    } catch (error) {
      console.error('Gmail email request errored', { message: error instanceof Error ? error.message : 'Unknown error' })
      return { status: 'failed', retryable: true, errorCode: error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'provider_unavailable' }
    }
  }
}
