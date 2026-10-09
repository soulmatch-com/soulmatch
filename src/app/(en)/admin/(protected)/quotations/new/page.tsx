import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QuotationManager } from '@/components/admin/QuotationManager'

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ leadId?: string }> }) {
  const { leadId } = await searchParams
  return <div className="container mx-auto max-w-5xl px-4 py-10"><Link href="/admin/quotations" className="inline-flex items-center text-sm font-medium text-slate-700"><ArrowLeft className="mr-1 h-4 w-4" />Back to quotations</Link><div className="mt-5"><p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Commercial workspace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Create quotation</h1><p className="mt-2 text-slate-600">Add service lines and optionally map the quotation to leads.</p></div><div className="mt-8"><QuotationManager initialLeadId={leadId} returnTo={leadId ? `/admin/leads/${leadId}` : undefined} /></div></div>
}
