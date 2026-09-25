import type { WebhookEventPayload } from 'resend'
import type { NormalizedProviderEvent } from '../../webhooks/provider-event-types.ts'

const delivery = new Map<string, NormalizedProviderEvent['deliveryStatus']>([
  ['email.delivered', 'delivered'], ['email.delivery_delayed', 'delayed'], ['email.bounced', 'bounced'],
  ['email.complained', 'complained'], ['email.suppressed', 'suppressed'], ['email.failed', 'failed'],
])

export function mapResendWebhook(event: WebhookEventPayload, providerEventId: string): NormalizedProviderEvent {
  const status = delivery.get(event.type) ?? null
  const data = 'email_id' in event.data ? event.data : null
  const permanentBounce = event.type === 'email.bounced' && 'bounce' in event.data && event.data.bounce.type.toLowerCase() === 'permanent'
  return {
    provider: 'resend', providerEventId, providerMessageId: data?.email_id ?? null, eventType: event.type,
    occurredAt: event.created_at ?? null, deliveryStatus: status,
    suppressionReason: event.type === 'email.complained' ? 'complaint' : event.type === 'email.suppressed' ? 'provider_suppression' : permanentBounce ? 'bounce' : null,
  }
}
