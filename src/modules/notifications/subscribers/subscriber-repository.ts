import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'
import { DuplicateSubscriberError, type EmailSubscriber, type SubscribeInput } from './subscriber-types.ts'

type SubscriberRow = Database['public']['Tables']['email_subscribers']['Row']

export interface SubscriberRepository {
  findByEmail(email: string): Promise<EmailSubscriber | null>
  create(input: SubscribeInput, timestamp: string): Promise<EmailSubscriber>
  resubscribe(existing: EmailSubscriber, input: SubscribeInput, timestamp: string): Promise<EmailSubscriber>
}

function toSubscriber(row: SubscriberRow): EmailSubscriber {
  return {
    id: row.id, email: row.email, preferredLocale: row.preferred_locale,
    status: row.status, consentSource: row.consent_source, consentedAt: row.consented_at,
    unsubscribedAt: row.unsubscribed_at, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export class SupabaseSubscriberRepository implements SubscriberRepository {
  private readonly db = createAdminClient()

  async findByEmail(email: string) {
    const { data, error } = await this.db.from('email_subscribers').select('*').eq('email', email).maybeSingle()
    if (error) throw new Error('Subscriber lookup failed')
    return data ? toSubscriber(data) : null
  }

  async create(input: SubscribeInput, timestamp: string) {
    const { data, error } = await this.db.from('email_subscribers').insert({
      email: input.email, preferred_locale: input.locale, status: 'subscribed', consent_source: input.source,
      consented_at: timestamp, unsubscribed_at: null, created_at: timestamp, updated_at: timestamp,
    }).select('*').single()
    if (error?.code === '23505') throw new DuplicateSubscriberError('Subscriber already exists')
    if (error) throw new Error('Subscriber creation failed')
    return toSubscriber(data)
  }

  async resubscribe(existing: EmailSubscriber, input: SubscribeInput, timestamp: string) {
    const { data, error } = await this.db.from('email_subscribers').update({
      status: 'subscribed', preferred_locale: input.locale, consent_source: input.source,
      consented_at: timestamp, unsubscribed_at: null, updated_at: timestamp,
    }).eq('id', existing.id).select('*').single()
    if (error) throw new Error('Subscriber resubscription failed')
    return toSubscriber(data)
  }
}
