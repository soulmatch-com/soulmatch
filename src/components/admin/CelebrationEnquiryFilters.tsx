'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CelebrationEnquiryDateScope, CelebrationEnquiryStatusFilter } from '@/lib/celebrations/admin-enquiries-core'

const statusOptions: { value: CelebrationEnquiryStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const dateScopeOptions: { value: CelebrationEnquiryDateScope; label: string }[] = [
  { value: 'current', label: 'Current / Future' },
  { value: 'past', label: 'Past Events' },
  { value: 'all', label: 'All' },
]

export function CelebrationEnquiryFilters({
  status,
  dateScope,
}: {
  status: CelebrationEnquiryStatusFilter
  dateScope: CelebrationEnquiryDateScope
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: 'status' | 'dateScope', value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    params.set('page', '1')
    router.push(`/admin/celebration-enquiries?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="w-full md:w-56">
        <Label htmlFor="celebration-enquiry-date-scope">Date</Label>
        <Select value={dateScope} onValueChange={(value) => updateFilter('dateScope', value)}>
          <SelectTrigger id="celebration-enquiry-date-scope" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateScopeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-56">
        <Label htmlFor="celebration-enquiry-status">Status</Label>
        <Select value={status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger id="celebration-enquiry-status" className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
