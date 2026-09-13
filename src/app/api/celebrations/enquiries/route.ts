import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { persistCelebrationEnquiry, type CelebrationRpcClient } from '@/lib/celebrations/enquiry-submission'
import { sendBookingNotification } from '@/lib/celebrations/email/booking-notification'
import type { PublicCelebrationService } from '@/lib/celebrations/service-query'
import { checkCelebrationEnquiryRateLimit } from '@/lib/celebrations/rate-limit'
import { verifyCelebrationBotChallenge } from '@/lib/celebrations/bot-verification'
import { CELEBRATION_BOT_TOKEN_HEADER } from '@/lib/celebrations/bot-verification-core'
import { celebrationEnquiryApiSchema } from '@/lib/validations/celebration-enquiry-api.schema'

const MAX_REQUEST_BYTES = 32 * 1024

export async function POST(request: NextRequest) {
  const rateLimit = await checkCelebrationEnquiryRateLimit(request)
  if (!rateLimit.allowed) {
    if ('unavailable' in rateLimit) {
      return NextResponse.json({ success: false, message: 'Unable to submit the enquiry right now' }, { status: 503 })
    }
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please wait a little while and try again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const botVerification = await verifyCelebrationBotChallenge(request.headers.get(CELEBRATION_BOT_TOKEN_HEADER))
  if (botVerification.status === 'misconfigured' || botVerification.status === 'unavailable') {
    return NextResponse.json(
      { success: false, message: 'Verification is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    )
  }
  if (botVerification.status === 'invalid') {
    return NextResponse.json(
      { success: false, message: "We couldn't verify the submission. Please try the verification again." },
      { status: 403 }
    )
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ success: false, message: 'Request is too large' }, { status: 413 })
  }

  let body: unknown
  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ success: false, message: 'Request is too large' }, { status: 413 })
    }
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON request body' }, { status: 400 })
  }

  const validation = celebrationEnquiryApiSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: 'Please check the enquiry details', errors: validation.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const client = createAdminClient()
    const result = await persistCelebrationEnquiry(client as unknown as CelebrationRpcClient, validation.data)
    if (!result.success) {
      console.error('Celebration enquiry RPC failed', { code: result.errorCode ?? 'unknown' })
      return NextResponse.json({ success: false, message: 'Unable to submit the enquiry right now' }, { status: 500 })
    }

    try {
      const { data } = await client.from('celebration_services').select('id, code, name, description, icon, display_order').in('id', validation.data.serviceIds)
      await sendBookingNotification({ enquiryId: result.enquiryId, enquiry: validation.data, services: (data ?? []) as PublicCelebrationService[] })
    } catch (error) {
      console.error('Celebration notification failed', { enquiryId: result.enquiryId, type: error instanceof Error ? error.name : 'UnknownError' })
    }

    return NextResponse.json({ success: true, enquiryId: result.enquiryId }, { status: 201 })
  } catch (error) {
    console.error('Unexpected celebration enquiry failure', {
      type: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ success: false, message: 'Unable to submit the enquiry right now' }, { status: 500 })
  }
}
