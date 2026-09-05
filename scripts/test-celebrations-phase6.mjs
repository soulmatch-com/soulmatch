import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import sitemap from '../src/app/sitemap.ts'
import robots from '../src/app/robots.ts'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('matrimony landing preserves the secondary signup journey', async () => { const source = await read('src/app/matrimony/page.tsx'); assert.match(source, /Find Matches/); assert.match(source, /href="\/signup"/); assert.match(source, /Member Login/) })
test('homepage renders the primary celebrations experience', async () => { const source = await read('src/app/celebrations/thirukadaiyur/page.tsx'); assert.match(source, /Celebrate Life&apos;s Sacred Milestones at Thirukadaiyur/); assert.match(source, /href="\/matrimony"/) })
test('homepage reuses the primary celebration landing', async () => { assert.match(await read('src/app/page.tsx'), /celebrations\/thirukadaiyur\/page/) })
test('homepage ceremony links and planning CTA are canonical', async () => { const source = await read('src/components/celebrations/CeremonyGrid.tsx'); assert.match(source, /href=\{`\/\$\{ceremony\.slug\}`\}/); assert.match(await read('src/components/celebrations/CelebrationCTA.tsx'), /href = '\/plan'/) })
test('desktop celebration routes are direct links without a Celebrations dropdown', async () => { const source = await read('src/components/Header.tsx'); for (const path of ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/plan', '/matrimony']) assert.ok(source.includes(`"${path}"`)); assert.doesNotMatch(source, />Celebrations<|mobile-celebrations-menu|isCelebrationsOpen/) })
test('mobile celebration navigation is flat, accessible, and closes through existing behavior', async () => { const source = await read('src/components/Header.tsx'); assert.match(source, /aria-expanded=\{isMenuOpen\}/); assert.match(source, /aria-controls="mobile-primary-menu"/); assert.match(source, /onClick=\{toggleMenu\}/); assert.match(source, /event\.key === 'Escape'/) })
test('create profile remains a matrimonial signup action', async () => { const source = await read('src/components/Header.tsx'); assert.match(source, /href="\/signup"/); assert.doesNotMatch(source, /href="\/celebrations[^\n]+Get Started/) })
test('footer exposes canonical celebration links', async () => { const source = await read('src/components/SiteFooter.tsx'); for (const path of ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/plan', '/matrimony']) assert.ok(source.includes(`'${path}'`)) })
test('sitemap includes new indexable routes and excludes plan', () => { const urls = sitemap().map(({ url }) => url); for (const path of ['/', '/60th-marriage', '/70th-marriage', '/80th-marriage', '/matrimony']) assert.ok(urls.includes(`https://mythirumanam.in${path}`)); assert.equal(urls.includes('https://mythirumanam.in/plan'), false) })
test('robots advertises sitemap and protects private application areas', () => { const value = robots(); assert.equal(value.sitemap, 'https://mythirumanam.in/sitemap.xml'); assert.ok(value.rules.disallow.includes('/admin/')); assert.ok(value.rules.disallow.includes('/api/')) })
test('legacy ceremony redirects remain permanent and direct', async () => { const source = await read('src/app/celebrations/[slug]/page.tsx'); assert.match(source, /permanentRedirect/); assert.match(source, /`\/\$\{slug\}`/) })
test('unsupported marketing metrics are absent from user-facing source', async () => { const sources = `${await read('src/app/page.tsx')}\n${await read('src/app/(auth)/layout.tsx')}`; assert.doesNotMatch(sources, /50L\+|2,?000\+|100% Verified|Most Trusted|Communities Served/) })
test('user-visible product branding uses MyThirumanam', async () => { const sources = `${await read('src/app/page.tsx')}\n${await read('src/components/Header.tsx')}\n${await read('src/components/SiteFooter.tsx')}\n${await read('src/components/admin/AdminHeader.tsx')}`; assert.doesNotMatch(sources, /Soul\s?Match/i); assert.match(sources, /MyThirumanam/) })
test('footer is omitted from admin routes', async () => assert.match(await read('src/components/ConditionalFooter.tsx'), /startsWith\('\/admin'\)/))
