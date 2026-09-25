import type { NotificationBatchProcessor, NotificationWorkerBatchResult } from '../workers/notification-worker-types.ts'

export type NotificationSchedulerConfig = {
  enabled: boolean
  batchSize: number
  maxBatchesPerRun: number
}

export type ScheduledNotificationResult =
  | ({ status: 'disabled' | 'processed' } & NotificationWorkerBatchResult & { batches: number })
  | ({ status: 'failed' } & NotificationWorkerBatchResult & { batches: number })

export type NotificationSchedulerWorker = Pick<NotificationBatchProcessor, 'processNotificationBatch'>
