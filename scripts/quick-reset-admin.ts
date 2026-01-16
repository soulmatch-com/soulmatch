#!/usr/bin/env node
/**
 * Quick Admin Password Reset
 *
 * Usage: npx tsx scripts/quick-reset-admin.ts <email> <new-password>
 * Example: npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com mynewpassword123
 */

import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '../src/lib/utils/password'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local manually
try {
  const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
} catch (error) {
  console.error('❌ Could not read .env.local file')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function quickResetPassword() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.log('\n🔐 Quick Admin Password Reset\n')
    console.log('Usage:')
    console.log('  npx tsx scripts/quick-reset-admin.ts <email> <new-password>\n')
    console.log('Example:')
    console.log('  npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com mynewpass123\n')

    // List existing admins
    const { data: admins } = await supabase
      .from('admins')
      .select('email, name, role, is_active')
      .order('created_at', { ascending: true })

    if (admins && admins.length > 0) {
      console.log('📋 Existing Admin Users:\n')
      admins.forEach((admin, index) => {
        const status = admin.is_active ? '🟢 Active' : '🔴 Inactive'
        console.log(`   ${index + 1}. ${admin.email} - ${admin.name} (${admin.role}) ${status}`)
      })
      console.log()
    }

    process.exit(1)
  }

  try {
    const emailLower = email.toLowerCase().trim()

    console.log(`\n🔍 Looking for admin: ${emailLower}`)

    // Check if admin exists
    const { data: admin, error: findError } = await supabase
      .from('admins')
      .select('id, email, name, role, is_active')
      .eq('email', emailLower)
      .single()

    if (findError || !admin) {
      console.error(`❌ Admin with email "${emailLower}" not found`)
      console.log('\nAvailable admins:')
      const { data: admins } = await supabase
        .from('admins')
        .select('email, name')
      admins?.forEach(a => console.log(`   - ${a.email} (${a.name})`))
      process.exit(1)
    }

    if (newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters')
      process.exit(1)
    }

    console.log(`✅ Found: ${admin.name} (${admin.role})`)
    console.log('⏳ Hashing new password...')

    const passwordHash = await hashPassword(newPassword)

    console.log('⏳ Updating password in database...')

    const { error: updateError } = await supabase
      .from('admins')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', admin.id)

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message)
      process.exit(1)
    }

    console.log('\n✅ Password reset successfully!\n')
    console.log('═'.repeat(60))
    console.log('📝 Updated Admin Credentials:')
    console.log('─'.repeat(60))
    console.log(`   Email:    ${emailLower}`)
    console.log(`   Password: ${newPassword}`)
    console.log(`   Role:     ${admin.role}`)
    console.log('═'.repeat(60))
    console.log('\n🔗 Test login at: http://localhost:3000/admin/login\n')

    process.exit(0)
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message || error)
    process.exit(1)
  }
}

quickResetPassword()
