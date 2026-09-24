import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { createNotificationWorker } from '@/modules/notifications/workers/notification-worker-factory'

function isAuthorized(value: string | null) {
  const secret = process.env.NOTIFICATION_WORKER_SECRET
  if (!secret || !value?.startsWith('Bearer ')) return false
  const supplied = Buffer.from(value.slice('Bearer '.length))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request.headers.get('authorization'))) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const result = await createNotificationWorker().processNotificationBatch()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ message: 'Unable to process notification batch.' }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } })
}
