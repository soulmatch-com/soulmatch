import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'
import { queryActiveCelebrationServices } from '@/lib/celebrations/service-query'

export type { PublicCelebrationService } from '@/lib/celebrations/service-query'

export async function getThirukadaiyurCelebrationServices() {
  const client = await createClient() as SupabaseClient<Database>
  return queryActiveCelebrationServices(client, 'thirukadaiyur')
}
