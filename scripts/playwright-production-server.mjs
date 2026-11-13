import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

// Browser flow tests use a local stand-in for Upstash. Rate-limit behavior is
// covered separately; application origin checks and production auth stay active.
const token = 'playwright-local-rate-limit-provider'
const rateLimitProvider = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401).end()
    return
  }
  try {
    let body = ''
    for await (const chunk of request) body += chunk
    const command = JSON.parse(body)
    if (!Array.isArray(command) || command[0] !== 'EVAL') throw Error('Unsupported fixture command')
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ result: [1, 7, 0] }))
  } catch {
    response.writeHead(400).end()
  }
})
await new Promise(resolve => rateLimitProvider.listen(0, '127.0.0.1', resolve))
const address = rateLimitProvider.address()
if (!address || typeof address === 'string') throw Error('Local rate-limit fixture failed to start')
const env = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: 'http://localhost:3001',
  UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${address.port}`,
  UPSTASH_REDIS_REST_TOKEN: token,
  ADMIN_LOGIN_RATE_LIMIT_SALT: 'playwright-local-admin-login',
}
let child
function shutdown() {
  child?.kill('SIGTERM')
  rateLimitProvider.close()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
try {
  await new Promise((resolve, reject) => {
    child = spawn('npm', ['run', 'build'], { env, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`Production test build exited with ${code}`)))
  })
  child = spawn('npm', ['run', 'start', '--', '--port', '3001'], { env, stdio: 'inherit' })
  child.once('error', error => { console.error(error); shutdown(); process.exitCode = 1 })
  child.once('exit', code => { rateLimitProvider.close(); process.exitCode = code ?? 1 })
} catch (error) {
  console.error(error)
  shutdown()
  process.exitCode = 1
}
