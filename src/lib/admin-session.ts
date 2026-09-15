import type { NextRequest, NextResponse } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'admin-session'
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60

export interface AdminSession {
  adminId: string
  email: string
  role: 'super_admin' | 'admin' | 'moderator'
  exp: number
}

const encoder = new TextEncoder()

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('Missing ADMIN_SESSION_SECRET environment variable')
  }

  return secret || 'development-admin-session-secret'
}

function base64UrlEncode(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return atob(padded)
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getAdminSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return base64UrlEncode(signature)
}

export async function createAdminSessionToken(
  admin: Omit<AdminSession, 'exp'>,
  maxAgeSeconds = ADMIN_SESSION_MAX_AGE_SECONDS
) {
  const payload: AdminSession = {
    ...admin,
    email: admin.email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = await sign(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export async function verifyAdminSessionToken(token?: string | null): Promise<AdminSession | null> {
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = await sign(encodedPayload)
  if (signature !== expectedSignature) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AdminSession>
    if (
      !payload.adminId ||
      !payload.email ||
      !payload.role ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return payload as AdminSession
  } catch {
    return null
  }
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function getAdminSessionFromRequest(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
}
