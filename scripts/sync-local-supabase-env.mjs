import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'

const run = promisify(execFile)
const { stdout } = await run('supabase', ['status', '--output', 'json'], { cwd: process.cwd(), maxBuffer: 1024 * 1024 })
const status = JSON.parse(stdout)
const url = new URL(status.API_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || status.linked_project || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
  throw new Error('Refusing: a verified unlinked local Supabase runtime is required')
}

let current = ''
try { current = await readFile('.env.local', 'utf8') } catch (error) { if (error?.code !== 'ENOENT') throw error }
const replacements = new Map([
  ['NEXT_PUBLIC_SUPABASE_URL', url.origin],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', status.ANON_KEY],
  ['SUPABASE_SERVICE_ROLE_KEY', status.SERVICE_ROLE_KEY],
])
const retained = current.split(/\r?\n/).filter((line) => ![...replacements.keys()].some((name) => line.startsWith(`${name}=`)))
const output = [...retained.filter(Boolean), ...[...replacements].map(([name, value]) => `${name}=${value}`), ''].join('\n')
await writeFile('.env.local', output, { mode: 0o600 })
console.log('Verified local Supabase environment synchronized to ignored .env.local.')
