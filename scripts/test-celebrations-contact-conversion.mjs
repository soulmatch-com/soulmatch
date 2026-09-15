import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

async function loadContactConfig(env = {}) {
  const original = {
    NEXT_PUBLIC_MYTHIRUMANAM_PHONE_E164: process.env.NEXT_PUBLIC_MYTHIRUMANAM_PHONE_E164,
    NEXT_PUBLIC_MYTHIRUMANAM_WHATSAPP_E164: process.env.NEXT_PUBLIC_MYTHIRUMANAM_WHATSAPP_E164,
    NEXT_PUBLIC_MYTHIRUMANAM_CONTACT_EMAIL: process.env.NEXT_PUBLIC_MYTHIRUMANAM_CONTACT_EMAIL,
  }

  process.env.NEXT_PUBLIC_MYTHIRUMANAM_PHONE_E164 = env.phone ?? ''
  process.env.NEXT_PUBLIC_MYTHIRUMANAM_WHATSAPP_E164 = env.whatsapp ?? ''
  process.env.NEXT_PUBLIC_MYTHIRUMANAM_CONTACT_EMAIL = env.email ?? ''

  try {
    return await import(`../src/lib/business-contact.ts?test=${Date.now()}-${Math.random()}`)
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('contact details come from central public-safe configuration', async () => {
  const [home, contactPage, footer, cta, config] = await Promise.all([
    read('src/app/(en)/celebrations/thirukadaiyur/page.tsx'),
    read('src/app/(en)/contact/page.tsx'),
    read('src/components/SiteFooter.tsx'),
    read('src/components/celebrations/CelebrationCTA.tsx'),
    read('src/lib/business-contact.ts'),
  ])

  assert.match(config, /businessContact/)
  assert.match(home, /CelebrationContactActions/)
  assert.match(contactPage, /businessContact/)
  assert.match(footer, /businessContact/)
  assert.match(cta, /CelebrationContactActions/)
})

test('no fake or test numbers are accepted by production contact configuration', async () => {
  for (const fake of ['+911234567890', '+919999999999', '+910000000000']) {
    const { businessContact, businessContactLinks } = await loadContactConfig({ phone: fake, whatsapp: fake })
    assert.equal(businessContact.phoneE164, undefined)
    assert.equal(businessContact.whatsappE164, undefined)
    assert.equal(businessContactLinks.callHref, undefined)
    assert.equal(businessContactLinks.whatsappHref, undefined)
  }
})

test('WhatsApp and Call actions are omitted when no approved numbers exist', async () => {
  const { businessContactLinks } = await loadContactConfig()
  assert.equal(businessContactLinks.whatsappHref, undefined)
  assert.equal(businessContactLinks.callHref, undefined)
})

test('Plan Celebration action always links to the existing plan form', async () => {
  const component = await read('src/components/celebrations/CelebrationContactActions.tsx')
  assert.match(component, /href="\/plan"/)
  assert.match(component, /Plan Celebration/)
})

test('WhatsApp uses configured E.164 number and a privacy-safe prefilled message', async () => {
  const { businessContact, businessContactLinks } = await loadContactConfig({ whatsapp: '+918888777766' })
  assert.equal(businessContact.whatsappE164, '+918888777766')
  assert.ok(businessContactLinks.whatsappHref?.startsWith('https://wa.me/918888777766?text='))
  const decoded = decodeURIComponent(new URL(businessContactLinks.whatsappHref).searchParams.get('text') ?? '')
  assert.match(decoded, /Hello MyThirumanam/)
  assert.doesNotMatch(decoded, /DOB|date of birth|Nakshatra|Rasi|guest|mobile|phone|enquiry|uuid|notes/i)
})

test('Call link uses canonical configured E.164 number', async () => {
  const { businessContact, businessContactLinks } = await loadContactConfig({ phone: '+918888777766' })
  assert.equal(businessContact.phoneE164, '+918888777766')
  assert.equal(businessContactLinks.callHref, 'tel:+918888777766')
})

test('shared contact component is reused on public celebration pages', async () => {
  const [home, ceremony] = await Promise.all([
    read('src/app/(en)/celebrations/thirukadaiyur/page.tsx'),
    read('src/components/celebrations/CeremonyPage.tsx'),
  ])

  assert.match(home, /<CelebrationContactActions tone="light" \/>/)
  assert.match(home, /<CelebrationContactActions variant="mobile-sticky" \/>/)
  assert.match(ceremony, /<CelebrationContactActions variant="mobile-sticky" \/>/)
})

test('/plan does not receive a conflicting mobile sticky contact bar', async () => {
  const planPage = await read('src/app/(en)/celebrations/thirukadaiyur/plan/page.tsx')
  assert.doesNotMatch(planPage, /CelebrationContactActions/)
  assert.doesNotMatch(planPage, /mobile-sticky/)
})

test('no WhatsApp API credentials, automation, or automatic sending are introduced', async () => {
  const source = await Promise.all([
    read('src/lib/business-contact.ts'),
    read('src/components/celebrations/CelebrationContactActions.tsx'),
    read('src/app/(en)/celebrations/thirukadaiyur/page.tsx'),
    read('src/components/celebrations/CeremonyPage.tsx'),
  ]).then((parts) => parts.join('\n'))

  assert.doesNotMatch(source, /WHATSAPP_ACCESS_TOKEN|WHATSAPP_TEMPLATE|WHATSAPP_PHONE_NUMBER_ID|webhook|graph\.facebook|messages\/send/i)
  assert.doesNotMatch(source, /fetch\(['"]https:\/\/wa\.me|sendWhatsApp|automatic WhatsApp/i)
})

test('contact copy avoids temple-authority wording and exposes accessibility labels', async () => {
  const source = await Promise.all([
    read('src/components/celebrations/CelebrationContactActions.tsx'),
    read('src/components/celebrations/CelebrationCTA.tsx'),
    read('src/app/(en)/celebrations/thirukadaiyur/page.tsx'),
  ]).then((parts) => parts.join('\n'))

  assert.doesNotMatch(source, /Call the temple|Contact Thirukadaiyur Temple|Temple WhatsApp|Official Booking Number|Temple Booking Helpdesk/i)
  assert.match(source, /Contact MyThirumanam on WhatsApp/)
  assert.match(source, /Call MyThirumanam/)
  assert.match(source, /aria-label/)
})
