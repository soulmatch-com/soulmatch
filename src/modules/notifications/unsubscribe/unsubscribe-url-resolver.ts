import { createUnsubscribeToken } from './unsubscribe-token.ts'

export class NotificationUnsubscribeUrlResolver {
  createUnsubscribeUrl(subscriberId: string) {
    const baseUrl = process.env.NOTIFICATION_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL
    if (!baseUrl) throw new Error('Notification public base URL is not configured.')
    const url = new URL('/unsubscribe', baseUrl)
    url.searchParams.set('token', createUnsubscribeToken(subscriberId))
    return url.toString()
  }

  async resolve(subscriberId: string) {
    return this.createUnsubscribeUrl(subscriberId)
  }
}
