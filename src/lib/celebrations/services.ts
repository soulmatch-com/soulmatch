import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import type { Database } from '@/types/database.types'
import { queryActiveCelebrationServices } from '@/lib/celebrations/service-query'

export type { PublicCelebrationService } from '@/lib/celebrations/service-query'

const getCachedThirukadaiyurCelebrationServices = unstable_cache(
  async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing public Supabase environment variables')
    }

    // This is public catalogue data, so it must not read request cookies. That
    // lets Next cache the result across visitors instead of querying Supabase
    // during every page render.
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as SupabaseClient<Database>

    return queryActiveCelebrationServices(client, 'thirukadaiyur')
  },
  ['thirukadaiyur-celebration-services'],
  { revalidate: 3600 }
)

export function getThirukadaiyurCelebrationServices() {
  return getCachedThirukadaiyurCelebrationServices()
}
