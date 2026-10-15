import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const { stdout } = await run('supabase', ['status', '--output', 'json'], { cwd: process.cwd(), maxBuffer: 1024 * 1024 })
const status = JSON.parse(stdout)
const url = new URL(status.API_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || status.linked_project || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
  throw new Error('Refusing to start: verified unlinked local Supabase credentials are required')
}

const child = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url.origin, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY },
  stdio: 'inherit',
})
child.on('exit', (code) => process.exit(code ?? 1))
