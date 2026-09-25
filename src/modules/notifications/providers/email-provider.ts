export type EmailMessage = {
  to: string
  from: string
  subject: string
  html: string
  text: string
  replyTo?: string
  idempotencyKey: string
}

export type EmailSendResult =
  | { status: 'accepted'; providerMessageId: string | null }
  | { status: 'failed'; retryable: boolean; errorCode: 'rate_limited' | 'provider_unavailable' | 'timeout' | 'server_error' | 'invalid_recipient' | 'suppressed_recipient' | 'invalid_request' | 'provider_not_configured' }

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>
}
