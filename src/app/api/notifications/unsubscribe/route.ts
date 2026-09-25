import { NextRequest, NextResponse } from 'next/server'

import { SupabaseSubscriberRepository } from '@/modules/notifications/subscribers/subscriber-repository'
import { UnsubscribeService } from '@/modules/notifications/unsubscribe/unsubscribe-service'

export async function POST(request: NextRequest) {
  if (!request.headers.get('content-type')?.includes('application/json')) return NextResponse.json({ message: 'Unable to process this unsubscribe request.' }, { status: 400 })
  try {
    const body: unknown = await request.json()
    const token = body && typeof body === 'object' && 'token' in body && typeof body.token === 'string' ? body.token : ''
    const result = await new UnsubscribeService(new SupabaseSubscriberRepository()).unsubscribe(token)
    if (result.status === 'invalid') return NextResponse.json({ message: 'This unsubscribe link is invalid or no longer available.' }, { status: 400 })
    return NextResponse.json({ status: 'unsubscribed' })
  } catch {
    return NextResponse.json({ message: 'Unable to process this unsubscribe request.' }, { status: 500 })
  }
}
