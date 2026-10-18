#!/usr/bin/env node
const required = ['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','ADMIN_SESSION_SECRET','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','ADMIN_LOGIN_RATE_LIMIT_SALT','CELEBRATION_RATE_LIMIT_SALT','TURNSTILE_SECRET_KEY']
const missing = required.filter(key => !process.env[key] || /your_|generate_a_|^$/.test(process.env[key]))
const invalidUrl = ['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL'].filter(key => { try { const url = new URL(process.env[key]); return url.protocol !== 'https:' || /localhost|127\.0\.0\.1/.test(url.hostname) } catch { return true } })
const conflicts = process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET === process.env.SUPABASE_SERVICE_ROLE_KEY ? ['ADMIN_SESSION_SECRET must differ from SUPABASE_SERVICE_ROLE_KEY'] : []
console.log(JSON.stringify({ ok: !missing.length && !invalidUrl.length && !conflicts.length, missing, invalidUrl, conflicts }))
process.exitCode = missing.length || invalidUrl.length || conflicts.length ? 2 : 0
