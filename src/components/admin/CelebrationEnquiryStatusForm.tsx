'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { celebrationEnquiryStatuses, type CelebrationEnquiryStatus } from '@/lib/validations/celebration-enquiry-status.schema'
import { getStatusLabel } from '@/lib/celebrations/admin-enquiry-detail-core'

export function CelebrationEnquiryStatusForm({ enquiryId, currentStatus }: { enquiryId: string; currentStatus: CelebrationEnquiryStatus | null }) {
  const router = useRouter()
  const [status, setStatus] = useState<'' | CelebrationEnquiryStatus>('')
  const [remarks, setRemarks] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedRemarks = remarks.trim()

    if (!status) return setFeedback('Select a new status.', true)
    if (!trimmedRemarks) return setFeedback('Remarks are required.', true)
    if (trimmedRemarks.length > 1000) return setFeedback('Remarks must be 1000 characters or fewer.', true)

    setIsSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/celebration-enquiries/${enquiryId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks: trimmedRemarks }),
      })
      const data = await response.json()

      if (!response.ok) {
        setFeedback(data.message || 'Unable to update status. Please try again.', true)
        return
      }

      setRemarks('')
      setStatus('')
      setFeedback('Status updated successfully.', false)
      router.refresh()
    } catch {
      setFeedback('Unable to update status. Please try again.', true)
    } finally {
      setIsSubmitting(false)
    }
  }

  function setFeedback(nextMessage: string, error: boolean) {
    setMessage(nextMessage)
    setIsError(error)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-sm text-slate-600">Current Status: <span className="font-medium text-slate-900">{getStatusLabel(currentStatus)}</span></div>
      <div>
        <Label htmlFor="celebration-enquiry-new-status">New Status</Label>
        <select
          id="celebration-enquiry-new-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as CelebrationEnquiryStatus)}
          disabled={isSubmitting}
          aria-describedby={message && isError ? 'celebration-enquiry-status-feedback' : undefined}
          className="mt-2 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select status</option>
          {celebrationEnquiryStatuses.map((option) => <option key={option} value={option}>{getStatusLabel(option)}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="celebration-enquiry-remarks">Remarks</Label>
        <Textarea
          id="celebration-enquiry-remarks"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          disabled={isSubmitting}
          maxLength={1000}
          aria-describedby={message && isError ? 'celebration-enquiry-status-feedback' : 'celebration-enquiry-remarks-help'}
          placeholder="Contacted customer and discussed requirements."
          className="mt-2"
        />
        <p id="celebration-enquiry-remarks-help" className="mt-2 text-xs text-slate-500">Required. Maximum 1000 characters.</p>
      </div>
      {message && <p id="celebration-enquiry-status-feedback" role="status" className={isError ? 'text-sm text-red-700' : 'text-sm text-green-700'}>{message}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Status'}</Button>
    </form>
  )
}
