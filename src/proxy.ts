import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/admin/')) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.get('origin')
      const configuredOrigin = normalizedOrigin(process.env.NEXT_PUBLIC_APP_URL)
      // Browser cookie mutations must carry an Origin. Non-browser automation
      // can opt in only outside production; production fails closed.
      if (process.env.NODE_ENV === 'production' && (!configuredOrigin || !origin || origin !== configuredOrigin)) return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
      if (origin && configuredOrigin && origin !== configuredOrigin) return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    }
    // `NextResponse.next().headers.set()` only affects the middleware
    // continuation in this runtime. Pass the response header explicitly so it
    // is retained on the API response returned by the route handler.
    return NextResponse.next({ headers: { 'Cache-Control': 'no-store' } })
  }
  // Public pages do not require a user lookup.  Avoiding the Supabase Auth
  // round trip here keeps these crawlable pages eligible for a fast response.
  if (isPublicRequest(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  return await updateSession(request)
}

function normalizedOrigin(value: string | undefined) {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

function isPublicRequest(pathname: string) {
  const publicRoutes = [
    '/',
    '/60th-marriage',
    '/70th-marriage',
    '/80th-marriage',
    '/about',
    '/contact',
    '/gallery',
    '/login',
    '/matrimony',
    '/plan',
    '/privacy',
    '/signup',
    '/terms',
    '/verify-otp',
    '/forgot-password',
    '/reset-password',
    '/blog',
    '/ta/blog',
    '/celebrations',
    '/api/auth',
    '/api/celebrations',
    // The admin portal has its own signed HttpOnly session and its protected
    // layout/API handlers enforce that session server-side.
    '/admin',
    '/api/admin',
  ]

  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
