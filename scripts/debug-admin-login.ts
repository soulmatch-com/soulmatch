#!/usr/bin/env node
/**
 * Debug Admin Login Issue
 * Tests the login flow step by step to identify the problem
 */

import { createClient } from '@supabase/supabase-js'
import { comparePassword, hashPassword } from '../src/lib/utils/password'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
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

async function debugLogin() {
  console.log('\n🔍 Debugging Admin Login\n')

  const testEmail = 'admin@soulmatch.com'
  const testPassword = 'Admin@123'

  try {
    // Step 1: Check if admin exists
    console.log('Step 1: Looking up admin in database...')
    const { data: admin, error: fetchError } = await supabase
      .from('admins')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', testEmail.toLowerCase())
      .single()

    if (fetchError) {
      console.error('❌ Database error:', fetchError.message)
      process.exit(1)
    }

    if (!admin) {
      console.error('❌ Admin not found')
      process.exit(1)
    }

    console.log('✅ Admin found:', admin.name, `(${admin.email})`)
    console.log('   Role:', admin.role)
    console.log('   Active:', admin.is_active)
    console.log('   Password hash length:', admin.password_hash.length)

    // Step 2: Check if admin is active
    if (!admin.is_active) {
      console.error('❌ Admin account is inactive')
      process.exit(1)
    }

    console.log('\nStep 2: Verifying password...')

    // Step 3: Test password comparison
    try {
      console.log('   Testing bcrypt.compare...')
      const isValid = await comparePassword(testPassword, admin.password_hash)

      if (isValid) {
        console.log('✅ Password is valid!')
      } else {
        console.log('❌ Password is INVALID')
        console.log('\nℹ️  This means the password hash in database doesn\'t match')
        console.log('   Run: npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com Admin@123')
      }
    } catch (bcryptError: any) {
      console.error('❌ bcrypt error:', bcryptError.message)
      console.error('\nFull error:')
      console.error(bcryptError)
      process.exit(1)
    }

    // Step 4: Test creating a new hash
    console.log('\nStep 3: Testing password hashing...')
    try {
      const newHash = await hashPassword('TestPassword123')
      console.log('✅ Hash generation works')
      console.log('   Sample hash:', newHash.substring(0, 29) + '...')
    } catch (hashError: any) {
      console.error('❌ Hash generation failed:', hashError.message)
      process.exit(1)
    }

    console.log('\n✅ All tests passed!')
    console.log('\nℹ️  If login still fails in browser:')
    console.log('   1. Check browser console for errors')
    console.log('   2. Check Network tab for response details')
    console.log('   3. Check terminal where "npm run dev" is running')

  } catch (error: any) {
    console.error('\n❌ Unexpected error:')
    console.error(error.message)
    console.error('\nFull error:')
    console.error(error)
    process.exit(1)
  }
}

debugLogin()
