import type { Metadata } from 'next'
import { CeremonyPage } from '@/components/celebrations/CeremonyPage'
import { getCeremony } from '@/lib/celebrations'
import { loadCelebrationServices } from '@/lib/celebrations/page-data'

const url = 'https://mythirumanam.in/60th-marriage'
export const metadata: Metadata = { title: 'Thirukadaiyur 60th Marriage | Sashtiapthapoorthi', description: 'Plan a 60th marriage or Sashtiapthapoorthi in Thirukadaiyur with support for ceremony arrangements, services, stay, food and family requirements.', alternates: { canonical: url }, openGraph: { title: 'Thirukadaiyur 60th Marriage | Sashtiapthapoorthi', description: 'Plan a 60th marriage or Sashtiapthapoorthi in Thirukadaiyur with support for ceremony arrangements, services, stay, food and family requirements.', url, siteName: 'MyThirumanam', type: 'website' } }
export default async function Page() { const result = await loadCelebrationServices(); return <CeremonyPage ceremony={getCeremony('60th-marriage')!} services={result.services} servicesFailed={result.failed} /> }
