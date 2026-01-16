#!/usr/bin/env node
/**
 * Verify Admin Table Exists
 *
 * This script checks if the admins table exists in the Supabase database
 * and reports on admin users if the table exists.
 */

import { createClient } from '@supabase/supabase-js'
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
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyAdminTable() {
  console.log('🔍 Checking Admin Table Status...\n')

  try {
    // Try to query the admins table
    const { data, error, count } = await supabase
      .from('admins')
      .select('id, email, name, role, is_active, created_at', { count: 'exact' })
      .limit(10)

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('❌ CRITICAL: admins table does NOT exist in database\n')
        console.log('📋 Next Steps:')
        console.log('1. Open Supabase Dashboard SQL Editor:')
        console.log('   https://supabase.com/dashboard/project/ggwzyfhvddhemzxsghmy/sql/new')
        console.log('\n2. Copy and paste the content from:')
        console.log('   src/lib/database/migrations/create_admins_table.sql')
        console.log('\n3. Click "Run" to create the table')
        console.log('\n4. Run this script again to verify')
        console.log('\n5. Create your first admin user:')
        console.log('   npx tsx src/scripts/create-admin.ts\n')
        process.exit(1)
      } else {
        console.error('❌ Error querying admins table:', error.message)
        process.exit(1)
      }
    }

    // Table exists!
    console.log('✅ SUCCESS: admins table exists in database')
    console.log(`📊 Total admin users: ${count}\n`)

    if (data && data.length > 0) {
      console.log('👥 Admin Users:')
      console.log('─'.repeat(80))
      data.forEach((admin, index) => {
        const status = admin.is_active ? '🟢 Active' : '🔴 Inactive'
        console.log(`${index + 1}. ${admin.name}`)
        console.log(`   Email: ${admin.email}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   Status: ${status}`)
        console.log(`   Created: ${new Date(admin.created_at).toLocaleDateString()}`)
        console.log('─'.repeat(80))
      })

      // Check if super_admin exists
      const hasSuperAdmin = data.some(admin => admin.role === 'super_admin' && admin.is_active)

      if (hasSuperAdmin) {
        console.log('\n✅ At least one active super_admin exists')
        console.log('\n🎉 Admin system is fully configured!')
        console.log('\n📍 Test admin login at: http://localhost:3000/admin/login\n')
      } else {
        console.log('\n⚠️  WARNING: No active super_admin found')
        console.log('Create a super_admin user:')
        console.log('   npx tsx src/scripts/create-admin.ts\n')
      }
    } else {
      console.log('⚠️  WARNING: admins table exists but is EMPTY')
      console.log('\n📋 Next Steps:')
      console.log('1. Create your first admin user:')
      console.log('   npx tsx src/scripts/create-admin.ts')
      console.log('\n2. Or use the hash-password script and insert manually:')
      console.log('   npx tsx src/scripts/hash-password.ts\n')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run verification
verifyAdminTable()
