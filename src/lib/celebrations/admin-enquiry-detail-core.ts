import type { CelebrationEnquiryStatus } from './admin-enquiries-core'

export interface CelebrationEnquiryHistoryEntry {
  id: string
  enquiry_id: string
  from_status: CelebrationEnquiryStatus | null
  to_status: CelebrationEnquiryStatus
  remarks: string
  changed_at: string
  changed_by: { name: string | null; email: string | null } | null
}

export function getCeremonyDurationLabel(value: 'one_session' | 'two_sessions' | null) {
  if (value === 'one_session') return '1 Session'
  if (value === 'two_sessions') return '2 Sessions'
  return '-'
}

export function getContactMethodLabel(value: 'phone' | 'whatsapp' | 'email') {
  const labels = { phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email' }
  return labels[value]
}

export function getArrangementPreferenceLabel(value: string) {
  const labels: Record<string, string> = {
    'ceremony-only': 'Ceremony Only',
    'ceremony-food': 'Ceremony and Food',
    'ceremony-stay': 'Ceremony and Stay',
    'complete-arrangement': 'Complete Arrangement',
    'need-guidance': 'Need Guidance',
  }
  return labels[value] ?? value
}

export function getHistoryTransitionLabel(entry: Pick<CelebrationEnquiryHistoryEntry, 'from_status' | 'to_status'>) {
  if (!entry.from_status) return entry.to_status === 'pending' ? 'Enquiry Submitted' : `Not Set to ${getStatusLabel(entry.to_status)}`
  return `${getStatusLabel(entry.from_status)} to ${getStatusLabel(entry.to_status)}`
}

export function getStatusLabel(status: CelebrationEnquiryStatus | null) {
  const labels: Record<CelebrationEnquiryStatus, string> = {
    pending: 'Pending',
    contacted: 'Contacted',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  }
  return status ? labels[status] : 'Not Set'
}

export function getHistoryChangedByLabel(entry: Pick<CelebrationEnquiryHistoryEntry, 'changed_by'>) {
  if (!entry.changed_by) return 'System'
  return entry.changed_by.name?.trim() || entry.changed_by.email?.trim() || 'Admin'
}
