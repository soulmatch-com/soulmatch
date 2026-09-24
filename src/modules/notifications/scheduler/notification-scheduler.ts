import type { NotificationSchedulerConfig, NotificationSchedulerWorker, ScheduledNotificationResult } from './notification-scheduler-types.ts'

const empty = () => ({ claimed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 })

export class NotificationScheduler {
  private readonly worker: NotificationSchedulerWorker
  private readonly config: NotificationSchedulerConfig

  constructor(worker: NotificationSchedulerWorker, config: NotificationSchedulerConfig) {
    this.worker = worker
    this.config = config
  }

  async processScheduledNotifications(): Promise<ScheduledNotificationResult> {
    const aggregate = empty()
    if (!this.config.enabled) return { status: 'disabled', batches: 0, ...aggregate }

    let batches = 0
    for (let index = 0; index < this.config.maxBatchesPerRun; index += 1) {
      try {
        const result = await this.worker.processNotificationBatch(this.config.batchSize)
        batches += 1
        aggregate.claimed += result.claimed
        aggregate.sent += result.sent
        aggregate.skipped += result.skipped
        aggregate.retried += result.retried
        aggregate.failed += result.failed
        if (result.claimed < this.config.batchSize) break
      } catch {
        return { status: 'failed', batches, ...aggregate }
      }
    }
    return { status: 'processed', batches, ...aggregate }
  }
}
