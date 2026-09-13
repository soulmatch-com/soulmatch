import 'server-only'

import type { CelebrationEnquiryApiInput } from '@/lib/validations/celebration-enquiry-api.schema'
import { getCelebrationServicePresentation, type PublicCelebrationService } from '@/lib/celebrations/service-query'

const ceremonyLabels = { '60th-marriage': '60th Marriage — Sashtiapthapoorthi', '70th-marriage': '70th Marriage — Bheemaratha Shanthi', '80th-marriage': '80th Marriage — Sathabhishekam', 'not-sure': 'Need Guidance' }
const arrangementLabels = { 'ceremony-only': 'Ceremony Only', 'ceremony-food': 'Ceremony + Food', 'ceremony-stay': 'Ceremony + Stay', 'complete-arrangement': 'Complete Arrangement', 'need-guidance': 'Need Guidance' }
const contactMethodLabels = { phone: 'Phone', whatsapp: 'WhatsApp', email: 'Email' }
const guestCountLabels = { 'below-20': 'Below 20', '20-50': '20–50', '51-100': '51–100', '100-plus': '100+' }
const planTypeLabels = { basic: 'Basic Plan', premium: 'Premium Plan' }
const ceremonyDurationLabels = { one_session: '1 Session', two_sessions: '2 Sessions' }

function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }
function displayDate(value?: string) { return value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Not provided' }
function optional(value?: string) { return value?.trim() || 'Not provided' }
function encodeMimeHeader(value: string) { return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=` }

export function createBookingNotification({ enquiryId, enquiryReference, enquiry, services }: { enquiryId: string; enquiryReference: string; enquiry: CelebrationEnquiryApiInput; services: PublicCelebrationService[] }) {
  const selectedServices = services.filter((service) => enquiry.serviceIds.includes(service.id)).map((service) => getCelebrationServicePresentation(service).name)
  const selectedAddons = services
    .filter((service) => enquiry.serviceIds.includes(service.id) && ['transportation', 'return_gifts'].includes(service.code))
    .map((service) => getCelebrationServicePresentation(service).name)
  const subject = `New ${ceremonyLabels[enquiry.celebrationType]} Enquiry — ${enquiryReference}`
  const sections = [
    ['Enquiry Reference', enquiryReference], ['Internal Enquiry ID', enquiryId], ['Ceremony', ceremonyLabels[enquiry.celebrationType]], ['Preferred Date', displayDate(enquiry.preferredDate)], ['Alternative Date', displayDate(enquiry.alternativeDate)], ['Guest Count', guestCountLabels[enquiry.guestCountRange]], ['Travelling From', optional(enquiry.travellingFrom)], ['Arrangement Preference', arrangementLabels[enquiry.arrangementPreference]],
    ['Plan', enquiry.planType ? planTypeLabels[enquiry.planType] : 'Not provided'], ['Plan Version', enquiry.planVersion ? String(enquiry.planVersion) : 'Not provided'], ['Expected Guests', enquiry.expectedGuestCount ? String(enquiry.expectedGuestCount) : 'Not provided'], ['Session', enquiry.ceremonyDuration ? ceremonyDurationLabels[enquiry.ceremonyDuration] : 'Not provided'], ['Optional Add-ons', selectedAddons.length ? selectedAddons.join('\n') : 'None selected'],
    ['Selected Services', selectedServices.length ? selectedServices.join('\n') : 'No services selected'], ['Selected Service Count', String(selectedServices.length)],
    ['Contact Name', enquiry.contactName], ['Mobile', enquiry.mobile], ['Email', optional(enquiry.email)], ['Relationship', enquiry.relationship], ['Preferred Contact Method', contactMethodLabels[enquiry.preferredContactMethod]],
    ['Other Requirements', optional(enquiry.otherServiceDetails)], ['Special Requirements', optional(enquiry.specialRequirements)], ['Additional Notes', optional(enquiry.notes)],
  ] as const
  const text = `MYTHIRUMANAM\n\nNew Celebration Enquiry\n\n${sections.map(([label, value]) => `${label}:\n${value}`).join('\n\n')}\n\nMyThirumanam\nIndependent event-management and coordination service.\nNot an official or authorized temple website.`
  const html = `<!doctype html><html><body style="margin:0;background:#fffaf3;color:#292524;font-family:Arial,sans-serif"><main style="max-width:640px;margin:0 auto;padding:24px"><header style="background:#681c24;color:#fff;padding:24px;border-radius:12px 12px 0 0"><strong style="color:#fbbf24;letter-spacing:1px">MYTHIRUMANAM</strong><h1 style="margin:12px 0 0;font-size:24px">New Celebration Enquiry</h1></header><section style="background:#fff;padding:24px;border:1px solid #fde68a"><table style="width:100%;border-collapse:collapse">${sections.map(([label, value]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;width:38%;font-weight:bold">${escapeHtml(label)}</td><td style="padding:10px 0;border-bottom:1px solid #f5f5f4;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join('')}</table></section><footer style="padding:18px 24px;background:#fef3c7;font-size:13px;line-height:1.5">MyThirumanam is an independent event-management and coordination service and is not an official or authorized temple website.</footer></main></body></html>`
  return { subject, text, html }
}

export async function sendBookingNotification(input: { enquiryId: string; enquiryReference: string; enquiry: CelebrationEnquiryApiInput; services: PublicCelebrationService[] }) {
  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN
  const to = process.env.CELEBRATION_BOOKINGS_EMAIL
  const from = process.env.CELEBRATION_EMAIL_FROM
  if (!clientId || !clientSecret || !refreshToken || !to || !from) {
    if (process.env.NODE_ENV === 'production') throw new Error('Celebration email configuration is missing')
    console.info('Celebration notification skipped', { enquiryId: input.enquiryId, reason: 'missing_configuration' })
    return
  }
  const message = createBookingNotification(input)
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) })
  if (!tokenResponse.ok) throw new Error(`Gmail OAuth token refresh failed with status ${tokenResponse.status}`)
  const tokenResult = await tokenResponse.json() as { access_token?: string }
  if (!tokenResult.access_token) throw new Error('Gmail OAuth token refresh returned no access token')
  const boundary = 'mythirumanam-notification'
  const mime = [`From: ${from}`, `To: ${to}`, `Subject: ${encodeMimeHeader(message.subject)}`, 'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', '', message.text, `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', '', message.html, `--${boundary}--`].join('\r\n')
  const raw = Buffer.from(mime, 'utf8').toString('base64url')
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${tokenResult.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) })
  if (!response.ok) throw new Error(`Gmail notification provider failed with status ${response.status}`)
  const result = await response.json().catch(() => ({})) as { id?: string }
  console.info('Celebration notification sent', { enquiryId: input.enquiryId, provider: 'gmail', messageId: result.id ?? 'unknown' })
}
