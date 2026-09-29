import 'server-only'

import { GmailApiEmailProvider } from '../providers/gmail-api-email-provider'
import { ResendEmailProvider } from '../providers/resend-email-provider'
import { SupabaseSuppressionRepository } from '../suppressions/suppression-repository'
import { NotificationUnsubscribeUrlResolver } from '../unsubscribe/unsubscribe-url-resolver'
import { SupabaseNotificationWorkerRepository } from './notification-worker-repository'
import { NotificationWorker } from './notification-worker'

export function createNotificationWorker() {
  const provider = process.env.NOTIFICATION_EMAIL_PROVIDER === 'gmail_api'
    ? new GmailApiEmailProvider()
    : new ResendEmailProvider()
  return new NotificationWorker(
    new SupabaseNotificationWorkerRepository(),
    provider,
    new NotificationUnsubscribeUrlResolver(),
    new SupabaseSuppressionRepository(),
  )
}
