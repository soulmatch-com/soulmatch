import type { ActiveSuppressionChecker } from './suppression-types.ts'

export class SuppressionService implements ActiveSuppressionChecker {
  private readonly repository: ActiveSuppressionChecker
  constructor(repository: ActiveSuppressionChecker) { this.repository = repository }
  hasActiveSuppression(subscriberId: string) { return this.repository.hasActiveSuppression(subscriberId) }
}
