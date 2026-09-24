import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ActiveSuppressionChecker } from './suppression-types.ts'

export class SupabaseSuppressionRepository implements ActiveSuppressionChecker {
  private readonly db = createAdminClient()

  async hasActiveSuppression(subscriberId: string) {
    const { data, error } = await this.db.from('email_suppressions').select('id').eq('subscriber_id', subscriberId).is('released_at', null).maybeSingle()
    if (error) throw new Error('Suppression lookup failed')
    return Boolean(data)
  }
}
