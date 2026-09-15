import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('only one Supabase celebration migration defines the schema', async () => {
  const files = await readdir(new URL('supabase/migrations/', root))
  const definitions = []
  for (const file of files) if ((await read(`supabase/migrations/${file}`)).match(/CREATE TABLE IF NOT EXISTS public\.celebration_(services|enquiries|enquiry_services)\b/)) definitions.push(file)
  assert.deepEqual(definitions, ['add_thirukadaiyur_celebrations.sql'])
})
test('migration seeds exactly the fourteen canonical service codes', async () => {
  const source = await read('supabase/migrations/add_thirukadaiyur_celebrations.sql')
  const expected = ['vadhyar', 'pooja_materials', 'marriage_hall', 'temple_coordination', 'catering', 'decoration', 'photography', 'videography', 'nadaswaram', 'accommodation', 'transportation', 'invitations', 'return_gifts', 'complete_arrangement']
  for (const code of expected) assert.match(source, new RegExp(`'thirukadaiyur', '${code}'`))
  assert.equal((source.match(/\('thirukadaiyur', '/g) ?? []).length, 14)
})
test('migration keeps private tables private and grants RPC only to service role', async () => {
  const source = await read('supabase/migrations/add_thirukadaiyur_celebrations.sql')
  assert.match(source, /REVOKE ALL ON TABLE public\.celebration_enquiries FROM PUBLIC, anon, authenticated/)
  assert.match(source, /REVOKE ALL ON TABLE public\.celebration_enquiry_services FROM PUBLIC, anon, authenticated/)
  assert.match(source, /REVOKE ALL ON FUNCTION[\s\S]+FROM PUBLIC, anon, authenticated/)
  assert.match(source, /GRANT EXECUTE ON FUNCTION[\s\S]+TO service_role/)
  assert.match(source, /SECURITY DEFINER[\s\S]+SET search_path = ''/)
})
test('RPC statically validates location, active services and atomic relationship insertion', async () => {
  const source = await read('supabase/migrations/add_thirukadaiyur_celebrations.sql')
  assert.match(source, /p_location IS DISTINCT FROM 'thirukadaiyur'/)
  assert.match(source, /AND location = p_location\s+AND is_active = TRUE/)
  assert.match(source, /INSERT INTO public\.celebration_enquiries[\s\S]+INSERT INTO public\.celebration_enquiry_services/)
})
test('enquiry API limits bodies, exposes no raw database error and logs no request payload', async () => {
  const source = await read('src/app/api/celebrations/enquiries/route.ts')
  assert.match(source, /MAX_REQUEST_BYTES = 32 \* 1024/)
  assert.match(source, /status: 413/)
  assert.doesNotMatch(source, /JSON\.stringify\(error\)|console\.error\([^\n]*(body|payload|mobile|email|notes)/i)
})
test('client submits normalized values only through the API boundary', async () => {
  const source = await read('src/lib/celebrations/client-submission.ts')
  assert.match(source, /\/api\/celebrations\/enquiries/)
  assert.doesNotMatch(source, /supabase|\.rpc\(|celebration_enquiries|service_role/i)
})
test('header contains no known dead navigation destinations', async () => {
  const source = await read('src/components/Header.tsx')
  assert.doesNotMatch(source, /href="\/(messages|help|how-it-works|about|pricing|contact)"/)
})
