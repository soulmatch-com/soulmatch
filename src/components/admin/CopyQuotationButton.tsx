'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CopyQuotationButton({ quotationId, showLabel = false, className, disabled = false }: { quotationId: string; showLabel?: boolean; className?: string; disabled?: boolean }) {
  const router = useRouter()
  const pending = useRef(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState('')

  async function copyQuotation() {
    if (pending.current || disabled) return
    pending.current = true
    setCopying(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/quotations/${quotationId}/copy`, { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to copy quotation.')
      router.push(`/admin/quotations/${data.quotationId}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to copy quotation.')
      pending.current = false
      setCopying(false)
    }
  }

  return <div className="flex min-w-0 flex-col items-start gap-1">
    <Button type="button" size={showLabel ? 'default' : 'icon'} variant="outline" className={className ?? 'size-11 xl:size-9'} aria-label={copying ? 'Copying…' : 'Copy quotation'} title={copying ? 'Copying…' : 'Copy quotation'} aria-busy={copying} disabled={copying || disabled} onClick={() => void copyQuotation()}>
      {copying ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
      {showLabel && (copying ? 'Copying…' : 'Copy')}
    </Button>
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
  </div>
}
