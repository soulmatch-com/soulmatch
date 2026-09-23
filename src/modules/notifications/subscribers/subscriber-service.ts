import { DuplicateSubscriberError, type SubscribeInput, type SubscribeResult } from './subscriber-types.ts'
import type { SubscriberRepository } from './subscriber-repository.ts'

export class SubscriberService {
  private readonly repository: SubscriberRepository
  private readonly now: () => string

  constructor(repository: SubscriberRepository, now = () => new Date().toISOString()) {
    this.repository = repository
    this.now = now
  }

  async subscribe(input: SubscribeInput): Promise<SubscribeResult> {
    const existing = await this.repository.findByEmail(input.email)
    if (!existing) {
      try {
        await this.repository.create(input, this.now())
        return { status: 'subscribed' }
      } catch (error) {
        // A concurrent request can win the unique-email race. Re-read the row
        // so the API remains idempotent without exposing database details.
        if (!(error instanceof DuplicateSubscriberError)) throw error
        const concurrentSubscriber = await this.repository.findByEmail(input.email)
        if (concurrentSubscriber?.status === 'subscribed') return { status: 'already_subscribed' }
        if (concurrentSubscriber?.status === 'unsubscribed') {
          await this.repository.resubscribe(concurrentSubscriber, input, this.now())
          return { status: 'resubscribed' }
        }
        throw error
      }
    }
    if (existing.status === 'subscribed') return { status: 'already_subscribed' }

    await this.repository.resubscribe(existing, input, this.now())
    return { status: 'resubscribed' }
  }
}
