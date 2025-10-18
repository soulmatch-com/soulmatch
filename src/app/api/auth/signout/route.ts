import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Sign out the user
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect to home page after sign out
  return NextResponse.redirect(new URL('/', request.url))
}
