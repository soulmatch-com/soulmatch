import { redirect } from 'next/navigation'
import { isCeremonySlug } from '@/lib/celebrations'

const legacyTypes: Record<string, string> = { '60th': '60th-marriage', '70th': '70th-marriage', '80th': '80th-marriage' }
export default async function LegacyEnquirePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const requested = (await searchParams).type
  const ceremony = requested && (legacyTypes[requested] ?? requested)
  redirect(isCeremonySlug(ceremony) ? `/plan?ceremony=${ceremony}` : '/plan')
}
