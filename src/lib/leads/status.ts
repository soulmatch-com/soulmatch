export const leadStatuses = ['new', 'contacted', 'follow_up', 'qualified', 'confirmed', 'completed', 'lost', 'expired'] as const

export const expirableLeadStatuses = ['new', 'contacted', 'follow_up', 'qualified'] as const

export function indiaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts()
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function isPastEventDate(eventDate: string | null | undefined, today = indiaToday()) {
  return Boolean(eventDate && eventDate < today)
}
