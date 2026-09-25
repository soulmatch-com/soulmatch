import 'server-only'

import { ResendEmailProvider } from '../providers/resend-email-provider'
import { SupabaseSuppressionRepository } from '../suppressions/suppression-repository'
import { NotificationUnsubscribeUrlResolver } from '../unsubscribe/unsubscribe-url-resolver'
import { SupabaseNotificationWorkerRepository } from './notification-worker-repository'
import { NotificationWorker } from './notification-worker'

export function createNotificationWorker() {
  return new NotificationWorker(
    new SupabaseNotificationWorkerRepository(),
    new ResendEmailProvider(),
    new NotificationUnsubscribeUrlResolver(),
    new SupabaseSuppressionRepository(),
  )
}
