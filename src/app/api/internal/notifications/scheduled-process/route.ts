import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getNotificationSchedulerConfig } from '@/modules/notifications/scheduler/notification-scheduler-config'
import { NotificationScheduler } from '@/modules/notifications/scheduler/notification-scheduler'
import { createNotificationWorker } from '@/modules/notifications/workers/notification-worker-factory'

function isAuthorized(value: string | null) {
  const secret = process.env.CRON_SECRET
  if (!secret || !value?.startsWith('Bearer ')) return false
  const supplied = Buffer.from(value.slice('Bearer '.length))
  const expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request.headers.get('authorization'))) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const result = await new NotificationScheduler(createNotificationWorker(), getNotificationSchedulerConfig()).processScheduledNotifications()
  console.info('Notification scheduler run completed', result)
  return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 200 })
}
