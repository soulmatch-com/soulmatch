import type { Metadata } from 'next'
import { CeremonyPage } from '@/components/celebrations/CeremonyPage'
import { getCeremony } from '@/lib/celebrations'
import { loadCelebrationServices } from '@/lib/celebrations/page-data'

const url = 'https://mythirumanam.in/80th-marriage'
export const metadata: Metadata = { title: 'Thirukadaiyur 80th Marriage | Sathabhishekam', description: 'Plan Sathabhishekam and 80th marriage celebrations in Thirukadaiyur with support tailored to your family traditions and ceremony requirements.', alternates: { canonical: url }, openGraph: { title: 'Thirukadaiyur 80th Marriage | Sathabhishekam', description: 'Plan Sathabhishekam and 80th marriage celebrations in Thirukadaiyur with support tailored to your family traditions and ceremony requirements.', url, siteName: 'MyThirumanam', type: 'website' } }
export default async function Page() { const result = await loadCelebrationServices(); return <CeremonyPage ceremony={getCeremony('80th-marriage')!} services={result.services} servicesFailed={result.failed} /> }
