import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CelebrationEnquiryFilters } from '@/components/admin/CelebrationEnquiryFilters'
import {
  CelebrationEnquiriesListError,
  formatIndiaDateOnly,
  formatIndiaDateTime,
  getCelebrationEnquiries,
  getCelebrationLabel,
  getCeremonyDurationLabel,
  getEmptyStateMessage,
  getGuestLabel,
  getPlanLabel,
  getStatusLabel,
  getUpcomingCelebrationEvents,
  normalizeCelebrationEnquiryView,
  type CelebrationEnquiryListRow,
  type CelebrationEnquiryView,
  type UpcomingCelebrationEventRow,
} from '@/lib/celebrations/admin-enquiries'
import { cn } from '@/lib/utils'

type SearchParams = Record<string, string | string[] | undefined>

const statusBadgeClass: Record<NonNullable<CelebrationEnquiryListRow['status']>, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  contacted: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

function buildEnquiriesHref(params: SearchParams) {
  const search = new URLSearchParams({ view: 'enquiries' })
  for (const key of ['page', 'status', 'dateScope']) {
    const value = params[key]
    if (typeof value === 'string') search.set(key, value)
  }
  return `/admin/celebration-enquiries?${search.toString()}`
}

function buildUpcomingHref(page = 1) {
  return `/admin/celebration-enquiries?view=upcoming&page=${page}`
}

function StatusBadge({ status }: { status: CelebrationEnquiryListRow['status'] }) {
  return <Badge variant="outline" className={status ? statusBadgeClass[status] : 'bg-slate-100 text-slate-700 border-slate-200'}>{getStatusLabel(status)}</Badge>
}

function Tabs({ activeView, searchParams }: { activeView: CelebrationEnquiryView; searchParams: SearchParams }) {
  return (
    <nav className="flex gap-1 border-b border-slate-200" aria-label="Celebration enquiry views">
      <Link href={buildEnquiriesHref(searchParams)} aria-current={activeView === 'enquiries' ? 'page' : undefined} className={cn('border-b-2 px-4 py-3 text-sm font-medium', activeView === 'enquiries' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900')}>
        Enquiries
      </Link>
      <Link href={buildUpcomingHref()} aria-current={activeView === 'upcoming' ? 'page' : undefined} className={cn('border-b-2 px-4 py-3 text-sm font-medium', activeView === 'upcoming' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900')}>
        Upcoming Events
      </Link>
    </nav>
  )
}

function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <Link href={href(Math.max(1, page - 1))} aria-label="Previous page" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={cn(buttonVariants({ variant: 'outline' }), page <= 1 && 'pointer-events-none opacity-50')}>Previous</Link>
      <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
      <Link href={href(Math.min(totalPages, page + 1))} aria-label="Next page" aria-disabled={page >= totalPages} tabIndex={page >= totalPages ? -1 : undefined} className={cn(buttonVariants({ variant: 'outline' }), page >= totalPages && 'pointer-events-none opacity-50')}>Next</Link>
    </div>
  )
}

function EnquiriesTable({ rows }: { rows: CelebrationEnquiryListRow[] }) {
  return <>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-3 pr-4 font-medium">Reference</th><th className="py-3 pr-4 font-medium">Enquiry Date</th><th className="py-3 pr-4 font-medium">Event Date</th><th className="py-3 pr-4 font-medium">Celebration</th><th className="py-3 pr-4 font-medium">Plan</th><th className="py-3 pr-4 font-medium">Contact Name</th><th className="py-3 pr-4 font-medium">Mobile</th><th className="py-3 pr-4 font-medium">Guests</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 font-medium">Action</th></tr></thead><tbody>{rows.map((enquiry) => <tr key={enquiry.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4 font-medium text-slate-900">{enquiry.enquiry_reference ?? '-'}</td><td className="py-4 pr-4 text-slate-700">{formatIndiaDateTime(enquiry.created_at)}</td><td className="py-4 pr-4 text-slate-700">{formatIndiaDateOnly(enquiry.preferred_date)}</td><td className="py-4 pr-4 text-slate-700">{getCelebrationLabel(enquiry.celebration_type)}</td><td className="py-4 pr-4 text-slate-700">{getPlanLabel(enquiry.plan_type)}</td><td className="py-4 pr-4 text-slate-700">{enquiry.contact_name}</td><td className="py-4 pr-4 text-slate-700">{enquiry.mobile}</td><td className="py-4 pr-4 text-slate-700">{getGuestLabel(enquiry)}</td><td className="py-4 pr-4"><StatusBadge status={enquiry.status} /></td><td className="py-4"><Link href={`/admin/celebration-enquiries/${enquiry.id}`} aria-label={`View enquiry ${enquiry.enquiry_reference ?? ''}`.trim()} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Eye className="h-4 w-4" />View</Link></td></tr>)}</tbody></table></div>
    <div className="space-y-4 md:hidden">{rows.map((enquiry) => <div key={enquiry.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{enquiry.enquiry_reference ?? '-'}</p><p className="text-sm text-slate-500">{formatIndiaDateOnly(enquiry.preferred_date)}</p></div><StatusBadge status={enquiry.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Contact</p><p className="font-medium text-slate-900">{enquiry.contact_name}</p></div><div><p className="text-slate-500">Mobile</p><p className="font-medium text-slate-900">{enquiry.mobile}</p></div><div><p className="text-slate-500">Celebration</p><p className="font-medium text-slate-900">{getCelebrationLabel(enquiry.celebration_type)}</p></div><div><p className="text-slate-500">Guests</p><p className="font-medium text-slate-900">{getGuestLabel(enquiry)}</p></div></div><Link href={`/admin/celebration-enquiries/${enquiry.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 w-full')}><Eye className="h-4 w-4" />View</Link></div>)}</div>
  </>
}

function UpcomingEventsTable({ rows }: { rows: UpcomingCelebrationEventRow[] }) {
  return <>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-3 pr-4 font-medium">Event Date</th><th className="py-3 pr-4 font-medium">Reference</th><th className="py-3 pr-4 font-medium">Celebration</th><th className="py-3 pr-4 font-medium">Plan</th><th className="py-3 pr-4 font-medium">Contact Name</th><th className="py-3 pr-4 font-medium">Mobile</th><th className="py-3 pr-4 font-medium">Guests</th><th className="py-3 pr-4 font-medium">Session</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 font-medium">Action</th></tr></thead><tbody>{rows.map((event) => <tr key={event.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4 font-semibold text-slate-900">{formatIndiaDateOnly(event.preferred_date)}</td><td className="py-4 pr-4 font-medium text-slate-900">{event.enquiry_reference ?? '-'}</td><td className="py-4 pr-4 text-slate-700">{getCelebrationLabel(event.celebration_type)}</td><td className="py-4 pr-4 text-slate-700">{getPlanLabel(event.plan_type)}</td><td className="py-4 pr-4 text-slate-700">{event.contact_name}</td><td className="py-4 pr-4 text-slate-700">{event.mobile}</td><td className="py-4 pr-4 text-slate-700">{getGuestLabel(event)}</td><td className="py-4 pr-4 text-slate-700">{getCeremonyDurationLabel(event.ceremony_duration)}</td><td className="py-4 pr-4"><StatusBadge status={event.status} /></td><td className="py-4"><Link href={`/admin/celebration-enquiries/${event.id}`} aria-label={`View enquiry ${event.enquiry_reference ?? ''}`.trim()} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Eye className="h-4 w-4" />View</Link></td></tr>)}</tbody></table></div>
    <div className="space-y-4 md:hidden">{rows.map((event) => <div key={event.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{formatIndiaDateOnly(event.preferred_date)}</p><p className="text-sm text-slate-600">{event.enquiry_reference ?? '-'}</p></div><StatusBadge status={event.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Celebration</p><p className="font-medium text-slate-900">{getCelebrationLabel(event.celebration_type)}</p></div><div><p className="text-slate-500">Contact</p><p className="font-medium text-slate-900">{event.contact_name}</p></div><div><p className="text-slate-500">Mobile</p><p className="font-medium text-slate-900">{event.mobile}</p></div><div><p className="text-slate-500">Guests</p><p className="font-medium text-slate-900">{getGuestLabel(event)}</p></div></div><Link href={`/admin/celebration-enquiries/${event.id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 w-full')}><Eye className="h-4 w-4" />View</Link></div>)}</div>
  </>
}

export default async function CelebrationEnquiriesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const rawSearchParams = await searchParams ?? {}
  const activeView = normalizeCelebrationEnquiryView(rawSearchParams)
  let enquiriesResult: Awaited<ReturnType<typeof getCelebrationEnquiries>> | null = null
  let upcomingResult: Awaited<ReturnType<typeof getUpcomingCelebrationEvents>> | null = null
  let queryFailed = false

  try {
    if (activeView === 'upcoming') {
      upcomingResult = await getUpcomingCelebrationEvents(rawSearchParams)
    } else {
      enquiriesResult = await getCelebrationEnquiries(rawSearchParams)
    }
  } catch (error) {
    if (error instanceof CelebrationEnquiriesListError && error.code === 'UNAUTHORIZED') redirect('/admin/login')
    queryFailed = true
  }

  if (queryFailed) {
    return <PageFrame activeView={activeView} searchParams={rawSearchParams}><Card><CardContent className="py-10 text-center text-slate-600">Unable to load celebration enquiries right now.</CardContent></Card></PageFrame>
  }

  if (upcomingResult) {
    const { rows, total, totalPages, params } = upcomingResult
    const currentPage = Math.min(params.page, totalPages)
    return <PageFrame activeView={activeView} searchParams={rawSearchParams}><Card><CardHeader><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><CardTitle>Upcoming Events</CardTitle><CardDescription>{total} upcoming confirmed events</CardDescription></div><Badge variant="secondary" className="w-fit">Page {currentPage} of {totalPages}</Badge></div></CardHeader><CardContent>{rows.length === 0 ? <div className="py-12 text-center text-slate-600">No upcoming confirmed events found.</div> : <UpcomingEventsTable rows={rows} />}<Pagination page={currentPage} totalPages={totalPages} href={buildUpcomingHref} /></CardContent></Card></PageFrame>
  }

  const { rows, total, totalPages, params } = enquiriesResult!
  const currentPage = Math.min(params.page, totalPages)
  return <PageFrame activeView={activeView} searchParams={rawSearchParams}><Card className="mb-6"><CardHeader><CardTitle>Filters</CardTitle><CardDescription>Latest enquiries are shown first.</CardDescription></CardHeader><CardContent><CelebrationEnquiryFilters status={params.status} dateScope={params.dateScope} /></CardContent></Card><Card><CardHeader><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><CardTitle>Enquiries</CardTitle><CardDescription>{total} matching enquiries</CardDescription></div><Badge variant="secondary" className="w-fit">Page {currentPage} of {totalPages}</Badge></div></CardHeader><CardContent>{rows.length === 0 ? <div className="py-12 text-center text-slate-600">{getEmptyStateMessage(params)}</div> : <EnquiriesTable rows={rows} />}<Pagination page={currentPage} totalPages={totalPages} href={(page) => buildEnquiriesHref({ ...rawSearchParams, page: String(page) })} /></CardContent></Card></PageFrame>
}

function PageFrame({ activeView, searchParams, children }: { activeView: CelebrationEnquiryView; searchParams: SearchParams; children: React.ReactNode }) {
  return <div className="container mx-auto px-4 py-10"><div className="mx-auto max-w-7xl"><div className="mb-8"><h1 className="text-3xl font-bold text-slate-900">Celebration Enquiries</h1><p className="mt-2 text-slate-600">View and manage submitted celebration enquiries.</p></div><div className="mb-6"><Tabs activeView={activeView} searchParams={searchParams} /></div>{children}</div></div>
}
