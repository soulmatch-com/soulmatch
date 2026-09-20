import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { comparePassword } from '@/lib/utils/password'
import { adminSessionCookie, createAdminSession } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Get Supabase admin client with service role key
    const supabase = createAdminClient()

    // Find admin by email
    const { data: admin, error: fetchError } = await supabase
      .from('admins')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email.toLowerCase())
      .single()

    // Debug logging
    console.log('Admin lookup error:', fetchError)
    console.log('Admin found:', admin ? 'Yes' : 'No')

    if (fetchError || !admin) {
      console.error('Login failed - Admin not found or error:', fetchError?.message)
      return NextResponse.json(
        {
          message: 'Invalid email or password',
          debug: process.env.NODE_ENV === 'development' ? {
            error: fetchError?.message,
            email: email.toLowerCase(),
            hint: 'Make sure the admins table exists and has data'
          } : undefined
        },
        { status: 401 }
      )
    }

    // Check if admin is active
    if (!admin.is_active) {
      return NextResponse.json(
        { message: 'Account is inactive. Contact super admin.' },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, admin.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login timestamp
    await supabase
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id)

    // Return admin data (excluding password_hash)
    const { password_hash: _, ...adminData } = admin

    const response = NextResponse.json(
      {
        admin: adminData,
        message: 'Login successful',
      },
      { status: 200 }
    )
    response.cookies.set(adminSessionCookie, createAdminSession(admin), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
