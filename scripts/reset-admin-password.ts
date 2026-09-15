#!/usr/bin/env node
/**
 * Reset Admin Password
 *
 * This script resets the password for an existing admin user
 */

import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '../src/lib/utils/password'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import * as readline from 'readline'

// Load environment variables from .env.local or .env manually
try {
  const envPath = ['.env.local', '.env']
    .map(file => resolve(process.cwd(), file))
    .find(file => existsSync(file))

  if (!envPath) {
    throw new Error('No .env.local or .env file found')
  }

  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
} catch (error) {
  console.error('❌ Could not read .env.local or .env file')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local or .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function resetAdminPassword() {
  try {
    console.log('\n🔐 Reset Admin Password\n')

    // First, list all admins
    const { data: admins, error: listError } = await supabase
      .from('admins')
      .select('id, email, name, role, is_active')
      .order('created_at', { ascending: true })

    if (listError) {
      console.error('❌ Error fetching admins:', listError.message)
      process.exit(1)
    }

    if (!admins || admins.length === 0) {
      console.log('❌ No admin users found in database')
      console.log('\nCreate a new admin user instead:')
      console.log('   npx tsx src/scripts/create-admin.ts\n')
      process.exit(1)
    }

    console.log('📋 Existing Admin Users:\n')
    admins.forEach((admin, index) => {
      const status = admin.is_active ? '🟢 Active' : '🔴 Inactive'
      console.log(`${index + 1}. ${admin.email} - ${admin.name} (${admin.role}) ${status}`)
    })

    console.log('\n')
    const emailInput = await question('Enter admin email to reset: ')
    const email = emailInput.toLowerCase().trim()

    // Find the admin
    const admin = admins.find(a => a.email === email)

    if (!admin) {
      console.error(`❌ Admin with email "${email}" not found`)
      rl.close()
      process.exit(1)
    }

    const newPassword = await question('Enter new password: ')

    if (newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters')
      rl.close()
      process.exit(1)
    }

    console.log('\n⏳ Hashing new password...')
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
      rl.close()
      process.exit(1)
    }

    console.log('\n✅ Password reset successfully!\n')
    console.log('📝 Updated Credentials:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${newPassword}`)
    console.log(`   Role: ${admin.role}`)
    console.log('\n🔗 Test login at: http://localhost:3000/admin/login\n')

    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    rl.close()
    process.exit(1)
  }
}

resetAdminPassword()
