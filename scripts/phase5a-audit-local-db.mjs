#!/usr/bin/env node
/**
 * Phase 5A local database evidence collector.  It is intentionally read-only:
 * it refuses non-loopback targets and submits only SELECT / SHOW statements.
 */
import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'

const run = promisify(execFile)
const requiredTables = ['admins', 'leads', 'quotations', 'quotation_items', 'quotation_leads', 'celebration_bookings', 'celebration_booking_services', 'celebration_booking_leads', 'event_tasks', 'event_vendors', 'event_vendor_assignments', 'booking_payment_records']
const requiredFunctions = ['create_admin_quotation', 'transition_admin_quotation', 'create_admin_booking', 'create_admin_event_task', 'record_admin_booking_payment', 'record_admin_booking_payment_refund', 'reverse_admin_booking_payment', 'booking_payment_summary']

function envFile(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(readFileSync(path, 'utf8').split('\n').flatMap(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/)
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : []
  }))
}
function assertLoopback(url, label) {
  if (!url) throw Error(`Missing ${label}`)
  const parsed = new URL(url)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw Error(`${label} is not loopback`)
  return parsed
}
async function sql(dbUrl, query) {
  const { stdout } = await run('psql', [dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { maxBuffer: 16 * 1024 * 1024 })
  return stdout.trim() ? JSON.parse(stdout) : []
}

let result
try {
  const env = { ...envFile('.env'), ...envFile('.env.local'), ...process.env }
  const configured = assertLoopback(env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
  const { stdout } = await run('supabase', ['status', '--output', 'json'], { maxBuffer: 1024 * 1024 })
  const status = JSON.parse(stdout)
  const runtime = assertLoopback(status.API_URL, 'local Supabase API_URL')
  if (status.linked_project || configured.origin !== runtime.origin) throw Error('Refusing ambiguous, linked, or mismatched Supabase target')
  const dbUrl = assertLoopback(status.DB_URL, 'local Supabase DB_URL').toString()
  const q = value => `select coalesce(json_agg(x order by 1), '[]'::json) from (${value}) x`
  const migrationStatus = await sql(dbUrl, "select json_build_object('schema_exists', exists(select 1 from pg_namespace where nspname='supabase_migrations'), 'table_exists', to_regclass('supabase_migrations.schema_migrations') is not null)")
  const migrationMeta = { ...migrationStatus, versions: migrationStatus.table_exists ? await sql(dbUrl, "select coalesce(json_agg(version order by version),'[]'::json) from supabase_migrations.schema_migrations") : [] }
  const [schemas, tables, columns, constraints, indexes, triggers, functions, policies, grants, functionGrants, schemaGrants, sequenceGrants] = await Promise.all([
    sql(dbUrl, q("select nspname from pg_namespace where nspname not like 'pg_%' order by nspname")),
    sql(dbUrl, q("select n.nspname as schema, c.relname as name, c.relkind as kind, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m','S') order by 1,2")),
    sql(dbUrl, q("select table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema='public' order by 1,3")),
    sql(dbUrl, q("select conrelid::regclass::text as table_name, conname, contype, pg_get_constraintdef(oid) as definition from pg_constraint where connamespace='public'::regnamespace order by 1,2")),
    sql(dbUrl, q("select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2")),
    sql(dbUrl, q("select event_object_table as table_name, trigger_name, event_manipulation, action_timing, action_statement from information_schema.triggers where trigger_schema='public' order by 1,2")),
    sql(dbUrl, q("select p.proname, pg_get_function_identity_arguments(p.oid) as arguments, pg_get_function_result(p.oid) as returns, pg_get_userbyid(p.proowner) as owner, p.prosecdef as security_definer, coalesce(array_to_string(p.proconfig, ','),'') as config, md5(pg_get_functiondef(p.oid)) as definition_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1,2")),
    sql(dbUrl, q("select tablename, policyname, permissive, roles::text, cmd, qual, with_check from pg_policies where schemaname='public' order by 1,2")),
    sql(dbUrl, q("select table_schema, table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role') order by 1,2,3,4")),
    sql(dbUrl, q("select routine_name, grantee, privilege_type from information_schema.routine_privileges where routine_schema='public' and grantee in ('anon','authenticated','service_role') order by 1,2,3")),
    sql(dbUrl, q("select object_schema, grantee, privilege_type from information_schema.usage_privileges where object_type='SCHEMA' and object_schema='public' and grantee in ('anon','authenticated','service_role') order by 1,2,3")),
    sql(dbUrl, q("select object_name, grantee, privilege_type from information_schema.usage_privileges where object_type='SEQUENCE' and object_schema='public' and grantee in ('anon','authenticated','service_role') order by 1,2,3"))
  ])
  const tableNames = new Set(tables.filter(x => x.kind === 'r').map(x => x.name))
  const functionNames = new Set(functions.map(x => x.proname))
  const missingTables = requiredTables.filter(x => !tableNames.has(x))
  const missingFunctions = requiredFunctions.filter(x => !functionNames.has(x))
  const unsafeFinancialFunctions = functions.filter(x => requiredFunctions.includes(x.proname) && x.security_definer && !/(^|,)search_path=/.test(x.config)).map(x => x.proname)
  result = { target: { apiOrigin: runtime.origin, linkedProject: Boolean(status.linked_project), verifiedLocal: true }, migrationMetadata: migrationMeta, counts: { schemas: schemas.length, tables: tables.filter(x => x.kind === 'r').length, views: tables.filter(x => x.kind === 'v').length, materializedViews: tables.filter(x => x.kind === 'm').length, sequences: tables.filter(x => x.kind === 'S').length, columns: columns.length, constraints: constraints.length, indexes: indexes.length, triggers: triggers.length, functions: functions.length, policies: policies.length, grants: grants.length }, required: { missingTables, missingFunctions, unsafeFinancialFunctions }, inventory: { schemas, tables, columns, constraints, indexes, triggers, functions, policies, grants, functionGrants, schemaGrants, sequenceGrants } }
  console.log(JSON.stringify(result, null, 2))
  // A missing metadata ledger is intentionally a blocking reconciliation finding.
  process.exitCode = missingTables.length || missingFunctions.length || unsafeFinancialFunctions.length || !migrationMeta.schema_exists || !migrationMeta.table_exists ? 2 : 0
} catch (error) {
  console.error(`phase5a audit refused: ${error.message}`)
  process.exitCode = 2
}
