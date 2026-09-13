import { notFound, permanentRedirect } from 'next/navigation'
import { isCeremonySlug } from '@/lib/celebrations'

export default async function LegacyCelebrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isCeremonySlug(slug)) notFound()
  permanentRedirect(`/${slug}`)
}
