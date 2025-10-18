// Password hashing utilities for admin authentication
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a plain text password
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a plain text password with a hash
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate password hash for seeding database
 * Usage: node -e "require('./dist/lib/utils/password').generateHash('password123')"
 */
export async function generateHash(password: string): Promise<void> {
  const hash = await hashPassword(password)
  console.log(`Password: ${password}`)
  console.log(`Hash: ${hash}`)
}
