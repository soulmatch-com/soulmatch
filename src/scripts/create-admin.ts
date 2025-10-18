// Script to create admin users
// Usage: npm run create-admin

import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '../lib/utils/password'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function createAdmin() {
  try {
    // Get Supabase credentials from env
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables')
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('\n🔐 Admin User Creation Tool\n')

    const email = await question('Email: ')
    const password = await question('Password: ')
    const name = await question('Name: ')
    const roleInput = await question('Role (super_admin/admin/moderator): ')

    const role = roleInput.toLowerCase() as 'super_admin' | 'admin' | 'moderator'

    if (!['super_admin', 'admin', 'moderator'].includes(role)) {
      console.error('❌ Invalid role. Must be super_admin, admin, or moderator')
      process.exit(1)
    }

    console.log('\n⏳ Hashing password...')
    const passwordHash = await hashPassword(password)

    console.log('⏳ Creating admin user...')
    const { data, error } = await supabase
      .from('admins')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        role,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating admin:', error.message)
      process.exit(1)
    }

    console.log('\n✅ Admin user created successfully!')
    console.log('\nCredentials:')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log(`Role: ${role}`)
    console.log(`\n⚠️  Save these credentials securely!`)

    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    rl.close()
    process.exit(1)
  }
}

createAdmin()
