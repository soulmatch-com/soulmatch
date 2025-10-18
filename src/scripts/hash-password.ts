// Simple script to generate password hashes for manual insertion
// Usage: npx tsx src/scripts/hash-password.ts

import { hashPassword } from '../lib/utils/password'

async function generateHashes() {
  const passwords = [
    { label: 'admin123', password: 'admin123' },
    { label: 'moderator123', password: 'moderator123' },
  ]

  console.log('\n🔐 Password Hashes for Database Seeding\n')
  console.log('Copy these hashes to your seed_admins.sql file:\n')

  for (const { label, password } of passwords) {
    const hash = await hashPassword(password)
    console.log(`-- Password: ${label}`)
    console.log(`'${hash}'`)
    console.log()
  }
}

generateHashes()
