import { QuotationManager } from '@/components/admin/QuotationManager'

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ leadId?: string }> }) {
  const { leadId } = await searchParams
  return <QuotationManager initialLeadId={leadId} returnTo={leadId ? `/admin/leads/${leadId}` : undefined} />
}
