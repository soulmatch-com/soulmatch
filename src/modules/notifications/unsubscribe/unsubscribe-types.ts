export type UnsubscribeTokenPayload = { subscriberId: string }
export type UnsubscribeResult = { status: 'unsubscribed' } | { status: 'invalid' }
