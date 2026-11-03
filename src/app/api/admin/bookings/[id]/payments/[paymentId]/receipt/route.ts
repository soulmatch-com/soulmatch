import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib'
import { requireActiveAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const amountFormat = new Intl.NumberFormat('en-IN', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const paymentDateFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
})
const paymentMethodLabel: Record<string, string> = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', card_external: 'Card (External)', other: 'Other' }
const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function amountInWords(amount: number) {
  const belowHundred = (value: number): string => value < 20 ? words[value] : `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${words[value % 10]}` : ''}`
  const integerWords = (value: number): string => {
    if (value < 100) return belowHundred(value)
    if (value < 1_000) return `${words[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${belowHundred(value % 100)}` : ''}`
    if (value < 100_000) return `${integerWords(Math.floor(value / 1_000))} Thousand${value % 1_000 ? ` ${integerWords(value % 1_000)}` : ''}`
    if (value < 10_000_000) return `${integerWords(Math.floor(value / 100_000))} Lakh${value % 100_000 ? ` ${integerWords(value % 100_000)}` : ''}`
    return `${integerWords(Math.floor(value / 10_000_000))} Crore${value % 10_000_000 ? ` ${integerWords(value % 10_000_000)}` : ''}`
  }
  const whole = Math.floor(amount), paise = Math.round((amount - whole) * 100)
  return `Rupees ${integerWords(whole) || 'Zero'}${paise ? ` and ${integerWords(paise)} Paise` : ''} Only`
}

const formatPaymentDate = (value: string) => paymentDateFormat.format(new Date(value)).replace(/\b(am|pm)\b/gi, match => match.toUpperCase())
const fit = (value: string, maxLength = 68) => value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value

export async function GET(_: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  const { id, paymentId } = await params
  const db = createAdminClient()
  const [{ data: booking, error: bookingError }, { data: payment, error: paymentError }] = await Promise.all([
    db.from('celebration_bookings').select('booking_reference,customer_name,currency').eq('id', id).maybeSingle(),
    db.from('booking_payment_records').select('payment_reference,transaction_type,amount,currency,payment_method,external_reference,payment_date,notes,status').eq('id', paymentId).eq('booking_id', id).maybeSingle(),
  ])
  if (bookingError || paymentError) return NextResponse.json({ error: 'Unable to load acknowledgement' }, { status: 500 })
  if (!booking || !payment) return NextResponse.json({ error: 'Committed payment record not found' }, { status: 404 })
  if (payment.status !== 'recorded') return NextResponse.json({ error: 'Acknowledgement is unavailable' }, { status: 409 })

  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`${payment.transaction_type} acknowledgement ${payment.payment_reference}`)
  pdf.setAuthor('MyThirumanam')
  pdf.setSubject('Payment acknowledgement — not a tax invoice')

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const amountFont = await pdf.embedFont(await readFile(path.join(process.cwd(), 'public/brand/NotoSansTamil.ttf')), { subset: true })
  const page = pdf.addPage([595.28, 841.89])
  const width = page.getWidth()
  const margin = 40
  const brand = rgb(0.5, 0.08, 0.12)
  const slate = rgb(0.24, 0.27, 0.32)
  const muted = rgb(0.38, 0.43, 0.49)
  const border = rgb(0.82, 0.84, 0.87)
  const fill = rgb(0.99, 0.975, 0.98)
  const text = (value: string, x: number, y: number, size = 10, font: PDFFont = regular, color = slate) => page.drawText(value, { x, y, size, font, color })
  const rightText = (value: string, right: number, y: number, size = 10, font: PDFFont = regular, color = slate) => text(value, right - font.widthOfTextAtSize(value, size), y, size, font, color)

  text('MyThirumanam', margin, 790, 21, bold, brand)
  rightText('PAYMENT ACKNOWLEDGEMENT', width - margin, 800, 10, bold, muted)
  rightText('www.mythirumanam.com  |  +91 78453 05728', width - margin, 787, 9, regular, muted)
  page.drawLine({ start: { x: margin, y: 775 }, end: { x: width - margin, y: 775 }, thickness: 1.4, color: brand })

  text(payment.transaction_type === 'receipt' ? 'RECEIPT' : payment.transaction_type.toUpperCase(), margin, 702, 20, bold, brand)
  text('Payment acknowledgement for your records', margin, 683, 10, regular, muted)

  const amount = Number(payment.amount)
  const cardBottom = 592
  page.drawRectangle({ x: margin, y: cardBottom, width: width - margin * 2, height: 64, color: fill, borderColor: border, borderWidth: 0.7 })
  text('AMOUNT ACKNOWLEDGED', margin + 10, 634, 10, bold, brand)
  text(`₹${amountFormat.format(amount)}`, 262, 629, 17, amountFont, brand)
  text('Amount in words', margin + 10, 604, 10, regular, muted)
  text(amountInWords(amount), 262, 603, 10, bold, slate)

  const rows: [string, string][] = [
    ['Booking reference', booking.booking_reference],
    ['Payment reference', payment.payment_reference],
    ['Customer', booking.customer_name || 'Not provided'],
    ['Date & time', formatPaymentDate(payment.payment_date)],
    ['Payment method', paymentMethodLabel[payment.payment_method || ''] || 'Not applicable'],
  ]
  if (payment.external_reference && payment.transaction_type === 'receipt') rows.push(['External transaction reference', payment.external_reference])
  if (payment.notes) rows.push(['Remarks', payment.notes])

  const tableTop = 568
  const rowHeight = 36
  const labelWidth = 220
  rows.forEach(([label, value], index) => {
    const y = tableTop - rowHeight * (index + 1)
    page.drawRectangle({ x: margin, y, width: width - margin * 2, height: rowHeight, color: rgb(1, 1, 1), borderColor: border, borderWidth: 0.55 })
    page.drawRectangle({ x: margin, y, width: labelWidth, height: rowHeight, color: rgb(0.987, 0.987, 0.99) })
    page.drawLine({ start: { x: margin + labelWidth, y }, end: { x: margin + labelWidth, y: y + rowHeight }, thickness: 0.55, color: border })
    text(label, margin + 10, y + 13, 9.5, bold, brand)
    text(fit(value), margin + labelWidth + 10, y + 13, 10, regular, slate)
  })

  const tableBottom = tableTop - rowHeight * rows.length
  const noteY = Math.max(164, tableBottom - 34)
  text('Important note', margin, noteY, 10, bold, brand)
  text('This receipt acknowledges a payment entry recorded manually by MyThirumanam and is provided for reference only. It is', margin, noteY - 20, 9, regular, muted)
  text('not a tax invoice. This acknowledgement records the entry only; it does not independently confirm a bank or UPI', margin, noteY - 34, 9, bold, muted)
  text('transfer, determine any tax treatment, or represent automated refund processing.', margin, noteY - 48, 9, regular, muted)

  page.drawLine({ start: { x: 310, y: 112 }, end: { x: width - margin, y: 112 }, thickness: 0.6, color: border })
  text('For MyThirumanam', margin, 76, 10, bold, brand)
  text('Authorised signatory', 310, 76, 10, regular, muted)
  page.drawLine({ start: { x: margin, y: 43 }, end: { x: width - margin, y: 43 }, thickness: 0.55, color: border })
  text('MyThirumanam is an independent event-management service.', margin, 28, 8.5, bold, muted)
  text('Please retain this acknowledgement along with your booking details.', margin, 12, 8.5, regular, muted)

  const bytes = await pdf.save()
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${payment.payment_reference}-acknowledgement.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
