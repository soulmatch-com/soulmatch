import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const pageWidth = 595.28
const pageHeight = 841.89
const brand = rgb(0.49, 0.03, 0.07)
const gold = rgb(0.79, 0.49, 0.04)
const cream = rgb(1, 0.98, 0.92)
const slate = rgb(0.2, 0.24, 0.3)
const border = rgb(0.9, 0.72, 0.4)
const numberFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function compactDate(value: string | null) {
  if (!value) return 'Not provided'
  const date = new Date(`${value}T00:00:00Z`)
  return `${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${date.getUTCFullYear()}`
}

function eventName(value: '60th-marriage' | '70th-marriage' | '80th-marriage' | null) {
  if (value === '60th-marriage') return '60th Marriage'
  if (value === '70th-marriage') return '70th Marriage'
  if (value === '80th-marriage') return '80th Marriage'
  return 'Not provided'
}

function sessionName(value: 'one_session' | 'two_sessions' | null) {
  return value === 'one_session' ? '1 Session' : value === 'two_sessions' ? '2 Sessions' : 'Not provided'
}

function wrap(text: string, maxCharacters: number) {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxCharacters && line) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  const { id } = await params
  const supabase = createAdminClient()
  const [{ data: quotation, error: quotationError }, { data: items, error: itemsError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('quotations').select('id, quotation_number, valid_until, notes, total_amount, created_at').eq('id', id).maybeSingle(),
    supabase.from('quotation_items').select('service_name, quantity, unit_price, line_total').eq('quotation_id', id).order('created_at', { ascending: true }),
    supabase.from('quotation_leads').select('lead_id').eq('quotation_id', id),
  ])
  if (quotationError || itemsError || linksError) return NextResponse.json({ error: 'Unable to load quotation details' }, { status: 500 })
  if (!quotation) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

  const leadIds = (links ?? []).map((link) => link.lead_id)
  const { data: leads, error: leadsError } = leadIds.length
    ? await supabase.from('leads').select('id, contact_name, event_type, event_date, event_session, total_members').in('id', leadIds)
    : { data: [], error: null }
  if (leadsError) return NextResponse.json({ error: 'Unable to load quotation lead details' }, { status: 500 })

  const pdf = await PDFDocument.create()
  pdf.setTitle(`Quotation ${quotation.quotation_number}`)
  pdf.setAuthor('MyThirumanam')
  pdf.setSubject('Celebration quotation')
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const logoBytes = await readFile(path.join(process.cwd(), 'public/brand/mythirumanam-logo.png'))
  const logo = await pdf.embedPng(logoBytes)
  const page = pdf.addPage([pageWidth, pageHeight])
  const text = (value: string, x: number, atY: number, size = 10, font = regular, color = slate) => page.drawText(value, { x, y: atY, size, font, color })
  const line = (x1: number, y1: number, x2: number, y2: number, color = border) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.75, color })
  const centered = (value: string, atY: number, size: number, font = regular, color = slate) => text(value, (pageWidth - font.widthOfTextAtSize(value, size)) / 2, atY, size, font, color)
  const primaryLead = leads?.[0]
  const leadNames = leads?.map((lead) => lead.contact_name).join(', ') || ''
  const tableLeft = 30
  const tableWidth = pageWidth - tableLeft * 2
  const numberColumn = 50
  const amountColumn = 150
  const particularsLeft = tableLeft + numberColumn
  const amountLeft = tableLeft + tableWidth - amountColumn

  const logoWidth = 108
  const logoHeight = logoWidth * logo.height / logo.width
  page.drawImage(logo, { x: 36, y: 790, width: logoWidth, height: logoHeight })
  centered('QUOTATION', 804, 16, serifBold, brand)
  centered(`${eventName(primaryLead?.event_type ?? null).toUpperCase()} MARRIAGE`, 788, 7, bold, gold)
  text('Website : www.mythirumanam.in', 392, 810, 7.5, bold, brand)
  text('Contact : +91 78453 05728', 392, 796, 7.5, bold, brand)

  centered(`${eventName(primaryLead?.event_type ?? null).toUpperCase()} / WEDDING ANNIVERSARY`, 728, 10, serifBold, brand)
  const detail = (label: string, value: string, labelX: number, valueX: number, atY: number) => {
    text(`${label}:`, labelX, atY, 8.5, bold, brand)
    text(value, valueX, atY, 8.5, bold, slate)
  }
  detail('Event', eventName(primaryLead?.event_type ?? null), 36, 73, 710)
  detail('Venue', 'Thirukadaiyur', 212, 249, 710)
  detail('Date', compactDate(primaryLead?.event_date ?? null), 36, 73, 697)
  detail('Prepared On', compactDate(quotation.created_at.slice(0, 10)), 212, 267, 697)
  detail('Session', sessionName(primaryLead?.event_session ?? null), 36, 78, 684)
  detail('Number of Peoples', primaryLead?.total_members ? String(primaryLead.total_members) : 'Not provided', 212, 302, 684)
  detail('Package', 'Premium', 36, 82, 671)
  let y = 643
  page.drawRectangle({ x: tableLeft, y: y - 14, width: tableWidth, height: 14, color: brand })
  text('No.', tableLeft + (numberColumn - bold.widthOfTextAtSize('No.', 7)) / 2, y - 10, 7, bold, rgb(1, 1, 1))
  const particularsHeader = 'Particulars'
  text(particularsHeader, particularsLeft + (amountLeft - particularsLeft - bold.widthOfTextAtSize(particularsHeader, 7)) / 2, y - 10, 7, bold, rgb(1, 1, 1))
  text('Amount (INR)', amountLeft + 30, y - 10, 7, bold, rgb(1, 1, 1))
  y -= 14
  for (const [index, item] of (items ?? []).entries()) {
    const particulars = item.quantity > 1 ? `${item.service_name} (${numberFormatter.format(item.unit_price)} x ${item.quantity})` : item.service_name
    const particularsLines = wrap(particulars, 46)
    const rowHeight = Math.max(14, particularsLines.length * 9 + 4)
    page.drawRectangle({ x: tableLeft, y: y - rowHeight, width: tableWidth, height: rowHeight, color: index % 2 ? rgb(1, 0.99, 0.96) : rgb(1, 1, 1), borderColor: border, borderWidth: 0.5 })
    line(particularsLeft, y, particularsLeft, y - rowHeight, border)
    line(amountLeft, y, amountLeft, y - rowHeight, border)
    text(String(index + 1), tableLeft + 25 - regular.widthOfTextAtSize(String(index + 1), 7) / 2, y - 10, 7)
    particularsLines.forEach((particularLine, lineIndex) => text(particularLine, particularsLeft + 6, y - 10 - lineIndex * 9, 7))
    const amount = numberFormatter.format(item.line_total)
    text(amount, tableLeft + tableWidth - 7 - regular.widthOfTextAtSize(amount, 7), y - 10, 7)
    y -= rowHeight
  }
  page.drawRectangle({ x: tableLeft, y: y - 15, width: tableWidth, height: 15, color: brand })
  const totalLabel = 'GRAND TOTAL'
  text(totalLabel, amountLeft - 10 - bold.widthOfTextAtSize(totalLabel, 9), y - 11, 9, bold, rgb(1, 1, 1))
  const total = `INR ${numberFormatter.format(quotation.total_amount)}`
  text(total, tableLeft + tableWidth - 8 - bold.widthOfTextAtSize(total, 9), y - 11, 9, bold, rgb(1, 1, 1))
  y -= 15
  page.drawRectangle({ x: tableLeft, y: y - 15, width: tableWidth, height: 15, color: cream, borderColor: gold, borderWidth: 0.75 })
  centered(`TOTAL QUOTATION AMOUNT  •  INR ${numberFormatter.format(quotation.total_amount)}`, y - 11, 10, serifBold, brand)
  y -= 55

  text('Terms & Notes', tableLeft, y, 10, serifBold, brand)
  y -= 12
  const terms = [
    `This quotation is for the ${eventName(primaryLead?.event_type ?? null)} as per the above items.`,
    'Any additional requirements will be charged separately.',
    'Rates are subject to change based on availability and final arrangements.',
    'Kindly confirm the quotation to proceed with the booking.',
    ...(quotation.notes ? wrap(quotation.notes, 90) : []),
  ]
  for (const term of terms.slice(0, 5)) { text(`• ${term}`, tableLeft + 7, y, 6.5); y -= 9 }
  text('Prepared By: MyThirumanam', tableLeft + 6, 56, 7, bold, brand)
  text('Contact: +91 78453 05728', tableLeft + 6, 45, 7, bold, brand)
  text(`Client: ${leadNames}`, 305, 56, 7, bold, brand)
  text('Signature:', 305, 45, 7, bold, brand)
  line(342, 43, 445, 43, slate)
  centered('MyThirumanam  |  www.mythirumanam.in  |  +91 78453 05728', 14, 6.5, bold, brand)

  const commonTemplate = await PDFDocument.load(await readFile(path.join(process.cwd(), 'Dhamaodaran-30102026.pdf')))
  const [commonCeremonyPage] = await pdf.copyPages(commonTemplate, [1])
  pdf.addPage(commonCeremonyPage)

  const bytes = await pdf.save()
  const body = new Uint8Array(bytes).buffer
  return new NextResponse(body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${quotation.quotation_number}.pdf"`, 'Cache-Control': 'private, no-store' } })
}
