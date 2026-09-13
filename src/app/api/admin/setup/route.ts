import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPassword } from '@/lib/utils/password'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Admin setup is disabled in production' }, { status: 404 })
  }

  if (process.env.ADMIN_SETUP_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Admin setup is disabled' }, { status: 403 })
  }

  try {
    // Get Supabase client
    const supabase = await createClient()

    // Check if any admins exist
    const { data: existingAdmins, error: checkError } = await supabase
      .from('admins')
      .select('id')
      .limit(1)

    if (checkError) {
      return NextResponse.json(
        { message: 'Database error. Make sure admins table exists.', error: checkError.message },
        { status: 500 }
      )
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { message: 'Admin users already exist. This endpoint is disabled.' },
        { status: 403 }
      )
    }

    const email = process.env.ADMIN_SETUP_EMAIL
    const password = process.env.ADMIN_SETUP_PASSWORD
    if (!email || !password || password.length < 12) {
      return NextResponse.json({ message: 'Admin setup credentials are not configured safely' }, { status: 400 })
    }
    const passwordHash = await hashPassword(password)

    const { error } = await supabase
      .from('admins')
      .insert({
        email,
        password_hash: passwordHash,
        name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { message: 'Failed to create admin', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'First admin created successfully!',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}
