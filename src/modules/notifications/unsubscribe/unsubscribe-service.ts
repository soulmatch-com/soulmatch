import type { SubscriberRepository } from '../subscribers/subscriber-repository.ts'
import { verifyUnsubscribeToken } from './unsubscribe-token.ts'
import type { UnsubscribeResult } from './unsubscribe-types.ts'

export class UnsubscribeService {
  private readonly repository: SubscriberRepository
  private readonly now: () => string
  constructor(repository: SubscriberRepository, now = () => new Date().toISOString()) { this.repository = repository; this.now = now }

  async unsubscribe(token: string): Promise<UnsubscribeResult> {
    const payload = verifyUnsubscribeToken(token)
    if (!payload) return { status: 'invalid' }
    const subscriber = await this.repository.findById(payload.subscriberId)
    if (!subscriber) return { status: 'invalid' }
    if (subscriber.status === 'subscribed') await this.repository.unsubscribe(subscriber.id, this.now())
    return { status: 'unsubscribed' }
  }
}
