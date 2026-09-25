import { NextRequest, NextResponse } from 'next/server'
import { mapResendWebhook } from '@/modules/notifications/providers/resend/resend-webhook-mapper'
import { ResendWebhookVerifier } from '@/modules/notifications/providers/resend/resend-webhook-verifier'
import { SupabaseProviderEventRepository } from '@/modules/notifications/webhooks/provider-event-repository'
import { ProviderEventService } from '@/modules/notifications/webhooks/provider-event-service'

export async function POST(request: NextRequest) {
  const payload = await request.text()
  try {
    const event = new ResendWebhookVerifier().verify(payload, { id: request.headers.get('svix-id'), timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature') })
    const result = await new ProviderEventService(new SupabaseProviderEventRepository()).process(mapResendWebhook(event, request.headers.get('svix-id')!))
    console.info('Notification provider event processed', { providerEventId: request.headers.get('svix-id'), jobId: result.jobId, campaignId: result.campaignId, status: result.status })
    return NextResponse.json({ status: result.status })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid webhook') return NextResponse.json({ message: 'Invalid webhook' }, { status: 400 })
    return NextResponse.json({ message: 'Unable to process webhook.' }, { status: 500 })
  }
}
