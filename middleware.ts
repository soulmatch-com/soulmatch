import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Public pages do not require a user lookup.  Avoiding the Supabase Auth
  // round trip here keeps these crawlable pages eligible for a fast response.
  if (isPublicRequest(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  return await updateSession(request)
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
