export const celebrationEnquiryStatusFilterValues = ['all', 'pending', 'contacted', 'confirmed', 'cancelled'] as const
export const celebrationEnquiryDateScopeValues = ['current', 'past', 'all'] as const
export const celebrationEnquiryViewValues = ['enquiries', 'upcoming'] as const
export const DEFAULT_CELEBRATION_ENQUIRY_PAGE = 1
export const DEFAULT_CELEBRATION_ENQUIRY_PAGE_SIZE = 20
export const MAX_CELEBRATION_ENQUIRY_PAGE_SIZE = 50
export const INDIA_TIME_ZONE = 'Asia/Kolkata'

export type CelebrationEnquiryStatusFilter = typeof celebrationEnquiryStatusFilterValues[number]
export type CelebrationEnquiryDateScope = typeof celebrationEnquiryDateScopeValues[number]
export type CelebrationEnquiryStatus = Exclude<CelebrationEnquiryStatusFilter, 'all'>
export type CelebrationEnquiryView = typeof celebrationEnquiryViewValues[number]

export interface CelebrationEnquiriesListParams {
  page: number
  pageSize: number
  status: CelebrationEnquiryStatusFilter
  dateScope: CelebrationEnquiryDateScope
}

export interface CelebrationEnquiryListRow {
  id: string
  enquiry_reference: string | null
  created_at: string
  preferred_date: string
  celebration_type: '60th-marriage' | '70th-marriage' | '80th-marriage' | 'not-sure'
  plan_type: 'basic' | 'premium' | null
  contact_name: string
  mobile: string
  expected_guest_count: number | null
  guest_count_range: 'below-20' | '20-50' | '51-100' | '100-plus'
  status: CelebrationEnquiryStatus | null
}

export interface UpcomingCelebrationEventRow extends CelebrationEnquiryListRow {
  ceremony_duration: 'one_session' | 'two_sessions' | null
}

export class CelebrationEnquiriesListError extends Error {
  readonly code: 'UNAUTHORIZED' | 'QUERY_FAILED'

  constructor(code: 'UNAUTHORIZED' | 'QUERY_FAILED', message: string) {
    super(message)
    this.name = 'CelebrationEnquiriesListError'
    this.code = code
  }
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function isStatusFilter(value: string | undefined): value is CelebrationEnquiryStatusFilter {
  return Boolean(value && celebrationEnquiryStatusFilterValues.includes(value as CelebrationEnquiryStatusFilter))
}

function isDateScope(value: string | undefined): value is CelebrationEnquiryDateScope {
  return Boolean(value && celebrationEnquiryDateScopeValues.includes(value as CelebrationEnquiryDateScope))
}

function isView(value: string | undefined): value is CelebrationEnquiryView {
  return Boolean(value && celebrationEnquiryViewValues.includes(value as CelebrationEnquiryView))
}

export function normalizeCelebrationEnquiryView(searchParams: Record<string, string | string[] | undefined> = {}) {
  const view = firstSearchParam(searchParams.view)
  return isView(view) ? view : 'enquiries'
}

export function normalizeCelebrationEnquiriesListParams(
  searchParams: Record<string, string | string[] | undefined> = {}
): CelebrationEnquiriesListParams {
  const pageValue = Number(firstSearchParam(searchParams.page))
  const pageSizeValue = Number(firstSearchParam(searchParams.pageSize))
  const statusValue = firstSearchParam(searchParams.status)
  const dateScopeValue = firstSearchParam(searchParams.dateScope)

  return {
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : DEFAULT_CELEBRATION_ENQUIRY_PAGE,
    pageSize: Number.isInteger(pageSizeValue) && pageSizeValue > 0
      ? Math.min(pageSizeValue, MAX_CELEBRATION_ENQUIRY_PAGE_SIZE)
      : DEFAULT_CELEBRATION_ENQUIRY_PAGE_SIZE,
    status: isStatusFilter(statusValue) ? statusValue : 'all',
    dateScope: isDateScope(dateScopeValue) ? dateScopeValue : 'current',
  }
}

export function getIndiaDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getCelebrationEnquiriesRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export interface CelebrationEnquiryQueryBuilder {
  gte(column: string, value: string): CelebrationEnquiryQueryBuilder
  lt(column: string, value: string): CelebrationEnquiryQueryBuilder
  eq(column: string, value: string): CelebrationEnquiryQueryBuilder
  order(column: string, options: { ascending: boolean }): CelebrationEnquiryQueryBuilder
  range(from: number, to: number): PromiseLike<{ data: CelebrationEnquiryListRow[] | null; error: { code?: string; name?: string; message?: string } | null; count: number | null }>
}

export function applyCelebrationEnquiriesListQuery(
  query: CelebrationEnquiryQueryBuilder,
  params: CelebrationEnquiriesListParams,
  today = getIndiaDateString()
) {
  let scopedQuery = query

  if (params.dateScope === 'current') {
    scopedQuery = scopedQuery.gte('preferred_date', today)
  } else if (params.dateScope === 'past') {
    scopedQuery = scopedQuery.lt('preferred_date', today)
  }

  if (params.status !== 'all') {
    scopedQuery = scopedQuery.eq('status', params.status)
  }

  const { from, to } = getCelebrationEnquiriesRange(params.page, params.pageSize)
  return scopedQuery.order('created_at', { ascending: false }).range(from, to)
}

export function applyUpcomingCelebrationEventsQuery(
  query: CelebrationEnquiryQueryBuilder,
  params: Pick<CelebrationEnquiriesListParams, 'page' | 'pageSize'>,
  today = getIndiaDateString()
) {
  const { from, to } = getCelebrationEnquiriesRange(params.page, params.pageSize)
  return query
    .eq('status', 'confirmed')
    .gte('preferred_date', today)
    .order('preferred_date', { ascending: true })
    .order('created_at', { ascending: true })
    .range(from, to)
}

export function getCelebrationLabel(value: CelebrationEnquiryListRow['celebration_type']) {
  const labels: Record<CelebrationEnquiryListRow['celebration_type'], string> = {
    '60th-marriage': '60th Marriage',
    '70th-marriage': '70th Marriage',
    '80th-marriage': '80th Marriage',
    'not-sure': 'Not Sure',
  }
  return labels[value]
}

export function getPlanLabel(value: CelebrationEnquiryListRow['plan_type']) {
  if (value === 'basic') return 'Basic'
  if (value === 'premium') return 'Premium'
  return '-'
}

export function getCeremonyDurationLabel(value: UpcomingCelebrationEventRow['ceremony_duration']) {
  if (value === 'one_session') return '1 Session'
  if (value === 'two_sessions') return '2 Sessions'
  return '-'
}

export function getGuestLabel(row: Pick<CelebrationEnquiryListRow, 'expected_guest_count' | 'guest_count_range'>) {
  if (row.expected_guest_count) return String(row.expected_guest_count)

  const labels: Record<CelebrationEnquiryListRow['guest_count_range'], string> = {
    'below-20': 'Below 20',
    '20-50': '20-50',
    '51-100': '51-100',
    '100-plus': '100+',
  }
  return labels[row.guest_count_range]
}

export function getStatusLabel(status: CelebrationEnquiryListRow['status']) {
  const labels: Record<CelebrationEnquiryStatus, string> = {
    pending: 'Pending',
    contacted: 'Contacted',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
  }
  return status ? labels[status] : 'Not Set'
}

export function getEmptyStateMessage(params: Pick<CelebrationEnquiriesListParams, 'dateScope' | 'status'>) {
  if (params.status !== 'all') return 'No enquiries match the selected filters.'
  if (params.dateScope === 'past') return 'No past enquiries found.'
  if (params.dateScope === 'current') return 'No current or upcoming enquiries found.'
  return 'No celebration enquiries found.'
}

export function formatIndiaDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

export function formatIndiaDateOnly(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+05:30`))
}
