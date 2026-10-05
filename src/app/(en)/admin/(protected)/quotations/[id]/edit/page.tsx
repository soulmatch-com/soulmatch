import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuotationManager } from '@/components/admin/QuotationManager'

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div className="container mx-auto max-w-5xl px-4 py-10">
    <Link href="/admin/quotations" className="inline-flex items-center text-sm font-medium text-slate-700"><ArrowLeft className="mr-1 h-4 w-4" />Back to quotations</Link>
    <div className="mt-5"><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Commercial workspace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Edit quotation</h1><p className="mt-2 text-slate-600">Update service lines, prices, lead, validity date, and notes.</p></div>
    <div className="mt-8"><QuotationManager quotationId={id} /></div>
  </div>
}
