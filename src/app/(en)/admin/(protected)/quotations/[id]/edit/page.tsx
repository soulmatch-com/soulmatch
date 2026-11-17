import { QuotationManager } from '@/components/admin/QuotationManager'

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <QuotationManager key={id} quotationId={id} />
}
