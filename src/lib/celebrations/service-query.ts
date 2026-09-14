import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types.ts'

type ServiceRow = Database['public']['Tables']['celebration_services']['Row']
export type PublicCelebrationService = Pick<ServiceRow, 'id' | 'code' | 'name' | 'description' | 'icon' | 'display_order'>

export function getCelebrationServicePresentation(service: PublicCelebrationService) {
  if (service.code === 'temple_coordination') {
    return {
      name: 'Temple-related Planning Assistance',
      description: 'Request help planning temple-related arrangements, subject to the respective temple authorities.',
    }
  }

  return { name: service.name, description: service.description }
}

const SERVICE_FIELDS = 'id, code, name, description, icon, display_order' as const

export async function queryActiveCelebrationServices(
  client: SupabaseClient<Database>,
  location: string
): Promise<PublicCelebrationService[]> {
  const { data, error } = await client
    .from('celebration_services')
    .select(SERVICE_FIELDS)
    .eq('location', location)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Celebration service catalogue query failed', { code: error.code })
    throw new Error('Unable to load celebration services')
  }

  return data ?? []
}
