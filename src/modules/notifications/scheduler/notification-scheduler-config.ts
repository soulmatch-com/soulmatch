import type { NotificationSchedulerConfig } from './notification-scheduler-types.ts'

export const SCHEDULED_NOTIFICATION_BATCH_SIZE = 25
export const SCHEDULED_NOTIFICATION_MAX_BATCHES = 4

export function getNotificationSchedulerConfig(): NotificationSchedulerConfig {
  return {
    enabled: process.env.NOTIFICATION_SCHEDULER_ENABLED === 'true',
    batchSize: SCHEDULED_NOTIFICATION_BATCH_SIZE,
    maxBatchesPerRun: SCHEDULED_NOTIFICATION_MAX_BATCHES,
  }
}
