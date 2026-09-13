import 'server-only'
import { getThirukadaiyurCelebrationServices, type PublicCelebrationService } from './services'
export type CelebrationServicesResult = { services: PublicCelebrationService[]; failed: boolean }
export async function loadCelebrationServices(): Promise<CelebrationServicesResult> {
  try { return { services: await getThirukadaiyurCelebrationServices(), failed: false } }
  catch { return { services: [], failed: true } }
}
