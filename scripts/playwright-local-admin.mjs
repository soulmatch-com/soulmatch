import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const args = process.argv.slice(2); const mode = args.find((value) => value === 'setup' || value === 'setup-inactive' || value === 'cleanup'); const explicit = args[args.indexOf('--env-file') + 1]
if (!mode || (args.includes('--env-file') && !explicit)) throw new Error('Use setup|setup-inactive|cleanup [--env-file path]')
const parse = (text) => Object.fromEntries(text.split('\n').flatMap((line) => { const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/); return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [] }))
async function optional(path) { try { return parse(await readFile(path, 'utf8')) } catch (error) { if (error?.code === 'ENOENT') return {}; throw error } }
// Precedence: explicit file, process environment, .env.local, then .env.
const env = { ...(await optional('.env')), ...(await optional('.env.local')), ...process.env, ...(explicit ? await optional(explicit) : {}) }
const url = env.NEXT_PUBLIC_SUPABASE_URL; const key = env.SUPABASE_SERVICE_ROLE_KEY
const artifact = mode === 'setup-inactive' ? '.playwright/local-inactive-admin.json' : '.playwright/local-admin.json'
if (!url || !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/.test(url)) throw new Error('Refusing: verified loopback NEXT_PUBLIC_SUPABASE_URL is required')
const run = promisify(execFile)
let runtime
try { ({ stdout: runtime } = await run('supabase', ['status', '--output', 'json'], { cwd: process.cwd(), maxBuffer: 1024 * 1024 })) } catch { throw new Error('Refusing: unable to inspect the isolated local Supabase runtime') }
let status
try { status = JSON.parse(runtime) } catch { throw new Error('Refusing: local Supabase status returned an unrecognised identity document') }
const configured = new URL(url); const runtimeUrl = new URL(status.API_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(configured.hostname) || configured.origin !== runtimeUrl.origin || status.linked_project) throw new Error('Refusing: configured URL is not the unlinked isolated local Supabase instance')
// Current local CLI releases issue sb_secret_* keys.  Legacy JWTs are allowed
// only when their local issuer/role claims prove the same local trust domain.
let localKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY
if (!localKey) {
  if (!key) throw new Error('Refusing: no local server credential is available')
  let claims; try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()) } catch { throw new Error('Refusing: unsupported local credential format') }
  if (claims.role !== 'service_role' || claims.ref || claims.iss !== 'supabase-demo') throw new Error('Refusing: credential cannot be verified as local')
  localKey = key
}
if (/^eyJ/.test(localKey)) { let claims; try { claims = JSON.parse(Buffer.from(localKey.split('.')[1], 'base64url').toString()) } catch { throw new Error('Refusing: malformed local service-role JWT') }; if (claims.role !== 'service_role' || claims.ref || claims.iss !== 'supabase-demo') throw new Error('Refusing: local runtime returned an unverifiable service credential') }
else if (!/^sb_secret_[A-Za-z0-9_-]+$/.test(localKey)) throw new Error('Refusing: unsupported local credential format')
const supabase = createClient(runtimeUrl.origin, localKey, { auth: { autoRefreshToken: false, persistSession: false } })
const { error: schemaError } = await supabase.from('admins').select('id, email, password_hash, is_active').limit(1)
if (schemaError) throw new Error(`Refusing: local database does not expose the expected admins schema (${schemaError.code || 'unknown'})`)
if (mode === 'setup' || mode === 'setup-inactive') {
  const email = `playwright-admin-${Date.now()}@local.test`; const password = `pw-${crypto.randomUUID()}`
  const { data, error } = await supabase.from('admins').insert({ email, password_hash: await bcrypt.hash(password, 10), name: 'Playwright Local Admin', role: 'admin', is_active: mode === 'setup' }).select('id').single()
  if (error || !data) throw new Error('Unable to provision verified local test admin')
  await mkdir('.playwright', { recursive: true }); await writeFile(artifact, JSON.stringify({ id: data.id, email, password }), { mode: 0o600 })
  console.log('Local Playwright admin provisioned.')
} else {
  for (const cleanupArtifact of ['.playwright/local-admin.json', '.playwright/local-inactive-admin.json']) {
    try { const saved = JSON.parse(await readFile(cleanupArtifact, 'utf8')); await supabase.from('admins').delete().eq('id', saved.id); await rm(cleanupArtifact) } catch (error) { if (error?.code !== 'ENOENT') throw error }
  }
  console.log('Local Playwright administrators cleaned up.')
}
