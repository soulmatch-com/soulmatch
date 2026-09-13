import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ceremonies, getCeremony, isCeremonySlug } from '../src/lib/celebrations.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const routes = ['src/app/page.tsx', 'src/app/60th-marriage/page.tsx', 'src/app/70th-marriage/page.tsx', 'src/app/80th-marriage/page.tsx', 'src/app/plan/page.tsx', 'src/app/matrimony/page.tsx']

test('all six canonical route modules exist', async () => { for (const route of routes) assert.ok((await read(route)).length > 0) })
test('ceremony configuration provides all canonical links', () => assert.deepEqual(ceremonies.map(({ slug }) => slug), ['60th-marriage', '70th-marriage', '80th-marriage']))
test('ceremony content is distinct and includes Tamil', () => { assert.equal(new Set(ceremonies.map(({ significance }) => significance)).size, 3); assert.ok(ceremonies.every(({ tamilName }) => /[\u0B80-\u0BFF]/u.test(tamilName))) })
test('valid ceremony query values are recognized', () => assert.ok(ceremonies.every(({ slug }) => isCeremonySlug(slug))))
test('invalid ceremony query values are safely rejected', () => assert.equal(isCeremonySlug('completed'), false))
test('ceremony lookup returns matching editorial content', () => assert.equal(getCeremony('70th-marriage')?.traditionalName, 'Bheemaratha Shanthi'))
test('public page loads services through the server helper', async () => { const source = await read('src/app/celebrations/thirukadaiyur/page.tsx'); assert.match(source, /loadCelebrationServices/); assert.doesNotMatch(source, /requestableServices|serviceOptions|celebrationServices/) })
test('service query preserves active filtering and ordering', async () => { const source = await read('src/lib/celebrations/service-query.ts'); assert.match(source, /\.eq\('is_active', true\)/); assert.match(source, /\.order\('display_order', \{ ascending: true \}\)/) })
test('service failure does not inject a static catalogue', async () => { const source = await read('src/lib/celebrations/page-data.ts'); assert.match(source, /services: \[\], failed: true/); assert.doesNotMatch(source, /Vadhyar|Catering|Photography/) })
test('unknown service icons have a generic fallback', async () => { const source = await read('src/components/celebrations/CelebrationServices.tsx'); assert.match(source, /\|\| CircleEllipsis/) })
test('legacy ceremony routes redirect directly to short canonical routes', async () => assert.match(await read('src/app/celebrations/[slug]/page.tsx'), /permanentRedirect\(`\/\$\{slug\}`\)/))
test('legacy enquiry route redirects to the canonical plan route', async () => assert.match(await read('src/app/celebrations/enquire/page.tsx'), /\/plan/))
test('canonical public routes declare metadata', async () => { for (const route of routes) assert.match(await read(route), /metadata/) })
