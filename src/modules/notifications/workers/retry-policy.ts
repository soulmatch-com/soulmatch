export const MAX_NOTIFICATION_ATTEMPTS = 4
const retryDelays = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]

export function getRetryDelayMs(attemptCount: number) {
  return retryDelays[Math.max(0, Math.min(retryDelays.length - 1, attemptCount - 1))]
}

export function shouldRetry(attemptCount: number, retryable: boolean) {
  return retryable && attemptCount < MAX_NOTIFICATION_ATTEMPTS
}
