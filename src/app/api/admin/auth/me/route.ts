import { NextResponse } from 'next/server'
import { requireActiveAdmin } from '@/lib/admin-auth'

export async function GET() {
  const authorization = await requireActiveAdmin()
  if ('response' in authorization) return authorization.response

  return NextResponse.json({ admin: authorization.admin })
}
