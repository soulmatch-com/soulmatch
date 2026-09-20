import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export const adminSessionCookie = 'mythirumanam_admin_session'

type AdminSession = { id: string; email: string; exp: number }

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('Missing ADMIN_SESSION_SECRET')
  return value
}

function signature(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createAdminSession(admin: { id: string; email: string }) {
  const payload = Buffer.from(JSON.stringify({ id: admin.id, email: admin.email.toLowerCase(), exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url')
  return `${payload}.${signature(payload)}`
}

export function readAdminSession(value: string | undefined): AdminSession | null {
  if (!value) return null
  const [payload, suppliedSignature] = value.split('.')
  if (!payload || !suppliedSignature) return null
  const expectedSignature = signature(payload)
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession
    return session.exp > Date.now() && session.id && session.email ? session : null
  } catch {
    return null
  }
}
