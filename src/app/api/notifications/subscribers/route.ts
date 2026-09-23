import { type NextRequest, NextResponse } from 'next/server'
import { SupabaseSubscriberRepository } from '@/modules/notifications/subscribers/subscriber-repository'
import { SubscriberService } from '@/modules/notifications/subscribers/subscriber-service'
import { subscribeRequestSchema } from '@/modules/notifications/subscribers/subscriber-validation'

const MAX_REQUEST_BYTES = 4 * 1024

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ message: 'Request is too large.' }, { status: 413 })
  }

  let body: unknown
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ message: 'Request is too large.' }, { status: 413 })
    }
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 })
  }

  const parsed = subscribeRequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: 'Please check your subscription details.' }, { status: 400 })

  try {
    const service = new SubscriberService(new SupabaseSubscriberRepository())
    const result = await service.subscribe({ email: parsed.data.email, locale: parsed.data.locale, source: parsed.data.source })
    return NextResponse.json(result, { status: result.status === 'subscribed' ? 201 : 200 })
  } catch (error) {
    console.error('Subscriber request failed', { type: error instanceof Error ? error.name : 'UnknownError' })
    return NextResponse.json({ message: 'Unable to subscribe right now. Please try again later.' }, { status: 500 })
  }
}
