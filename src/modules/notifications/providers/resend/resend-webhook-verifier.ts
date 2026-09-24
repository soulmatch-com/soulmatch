import 'server-only'

import { Resend } from 'resend'

export class ResendWebhookVerifier {
  verify(payload: string, headers: { id: string | null; timestamp: string | null; signature: string | null }) {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret || !headers.id || !headers.timestamp || !headers.signature) throw new Error('Invalid webhook')
    try {
      return new Resend().webhooks.verify({ payload, webhookSecret: secret, headers: { id: headers.id, timestamp: headers.timestamp, signature: headers.signature } })
    } catch {
      throw new Error('Invalid webhook')
    }
  }
}
