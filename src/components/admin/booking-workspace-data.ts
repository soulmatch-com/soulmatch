'use client'

import { useQuery } from '@tanstack/react-query'

export type BookingActivity = {
  id: string
  event_type: string
  created_at: string
  previous_status: string | null
  new_status: string
  actorName: string
  metadata: Record<string, unknown> | null
}
export type BookingService = {
  id: string
  service_name_snapshot: string
  quantity: number
  service_code_snapshot: string
  description_snapshot: string | null
  fulfillment_status: string
  total_price_snapshot: number
}
type Quotation = { id: string; quotation_number: string; total_amount: number }
export type BookingDetailData = {
  booking: {
    id: string
    booking_reference: string
    customer_name: string | null
    ceremony_type: string | null
    event_date: string | null
    customer_contact: string | null
    quoted_total: number
    status: string
    quotation_id: string
    quotations: { quotation_number: string } | null
  }
  services: BookingService[]
  activities: BookingActivity[]
  leads: { lead_id: string; leads: { contact_name: string; mobile: string | null; email: string | null } | null }[]
  allowedTransitions: string[]
  additionalQuotations: { quotation_id: string; linked_at: string; quotations: Quotation | null }[]
  eligibleAdditionalQuotations: Quotation[]
}
export type PaymentSummary = {
  booking_total: number
  gross_received: number
  total_refunded: number
  total_reversed: number
  net_received: number
  outstanding_balance: number
  payment_status: string
}
export type WorkspaceTask = {
  id: string
  title: string
  status: string
  due_date: string | null
  admins: { email: string } | null
}
export type WorkspaceAssignment = {
  id: string
  status: string
  agreed_cost: number | null
  scheduled_date: string | null
  event_vendors: { vendor_name: string } | null
  celebration_booking_services: { service_name_snapshot: string } | null
}

export const bookingQueryKey = (id: string) => ['admin-booking', id] as const

export function useBookingResource<T>(id: string, resource = '', enabled = true) {
  return useQuery<T, Error>({
    queryKey: [...bookingQueryKey(id), resource],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/admin/bookings/${id}${resource ? `/${resource}` : ''}`, { signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load booking data.')
      return data as T
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

export const useBookingData = (id: string) => useBookingResource<BookingDetailData>(id)
export const useBookingSummary = (id: string) => useBookingResource<{ summary: PaymentSummary }>(id, 'payment-summary')
export const bookingMoney = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
export const bookingLabel = (value: string) => value === 'ready' ? 'Ready for Event' : value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
