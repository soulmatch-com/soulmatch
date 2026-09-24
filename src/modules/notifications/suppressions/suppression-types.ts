export const suppressionReasons = ['bounce', 'complaint', 'provider_suppression', 'manual_admin'] as const
export const suppressionSources = ['provider', 'admin', 'system'] as const
export type SuppressionReason = (typeof suppressionReasons)[number]
export type SuppressionSource = (typeof suppressionSources)[number]
export type ActiveSuppressionChecker = { hasActiveSuppression(subscriberId: string): Promise<boolean> }
