import type { Metadata } from 'next'
import { CeremonyPage } from '@/components/celebrations/CeremonyPage'
import { getCeremony } from '@/lib/celebrations'
import { loadCelebrationServices } from '@/lib/celebrations/page-data'

const url = 'https://mythirumanam.in/70th-marriage'
export const metadata: Metadata = { title: 'Thirukadaiyur 70th Marriage | Bheemaratha Shanthi', description: 'Plan Bheemaratha Shanthi and 70th marriage celebrations in Thirukadaiyur with flexible ceremony, hospitality and family planning support.', alternates: { canonical: url }, openGraph: { title: 'Thirukadaiyur 70th Marriage | Bheemaratha Shanthi', description: 'Plan Bheemaratha Shanthi and 70th marriage celebrations in Thirukadaiyur with flexible ceremony, hospitality and family planning support.', url, siteName: 'MyThirumanam', type: 'website' } }
export default async function Page() { const result = await loadCelebrationServices(); return <CeremonyPage ceremony={getCeremony('70th-marriage')!} services={result.services} servicesFailed={result.failed} /> }
