import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import sharp from 'sharp'
import manifest from '../src/app/manifest.ts'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url))
const sourcePath = 'assets/brand/839F3D1B-38F3-439C-9C7F-1CA730683B61.png'

test('canonical horizontal logo is an exact crop of the approved source with alpha preserved', async () => {
  const source = await read(sourcePath)
  const logo = await read('public/brand/mythirumanam-logo.png')
  const meta = await sharp(logo).metadata()
  assert.equal(meta.width, 1670)
  assert.equal(meta.height, 564)
  assert.equal(meta.hasAlpha, true)
  const expected = await sharp(source).extract({ left: 64, top: 122, width: 1670, height: 564 }).raw().toBuffer()
  assert.deepEqual(await sharp(logo).raw().toBuffer(), expected)
})

test('ICO contains native 16, 32 and 48 pixel transparent emblem frames', async () => {
  const ico = await read('src/app/favicon.ico')
  assert.equal(ico.readUInt16LE(2), 1)
  assert.equal(ico.readUInt16LE(4), 3)
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16
    assert.equal(ico[entry], size)
    assert.equal(ico[entry + 1], size)
    const offset = ico.readUInt32LE(entry + 12)
    const length = ico.readUInt32LE(entry + 8)
    const frame = ico.subarray(offset, offset + length)
    const meta = await sharp(frame).metadata()
    assert.equal(meta.width, size)
    assert.equal(meta.height, size)
    assert.equal(meta.hasAlpha, true)
    const { data, info } = await sharp(frame).raw().toBuffer({ resolveWithObject: true })
    assert.equal(data[3], 0)
    // Emblem fills both dimensions; a squeezed horizontal wordmark would not.
    const points = []
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 32) points.push([x, y])
    const width = Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x)) + 1
    const height = Math.max(...points.map(([, y]) => y)) - Math.min(...points.map(([, y]) => y)) + 1
    assert.ok(width / height > 0.8 && width / height < 1.1)
    assert.ok(height >= size * 0.75)
  }
})

test('Apple and app icons have correct dimensions and transparent safe padding', async () => {
  for (const [path, size] of [['src/app/apple-icon.png', 180], ['public/brand/mythirumanam-icon-192.png', 192], ['src/app/icon.png', 512]]) {
    const image = await read(path)
    const meta = await sharp(image).metadata()
    assert.equal(meta.width, size)
    assert.equal(meta.height, size)
    assert.equal(meta.hasAlpha, true)
    const { data } = await sharp(image).raw().toBuffer({ resolveWithObject: true })
    for (let x = 0; x < size; x++) {
      assert.equal(data[x * 4 + 3], 0)
      assert.equal(data[((size - 1) * size + x) * 4 + 3], 0)
    }
  }
})

test('shared header and footer use the sole horizontal logo with correct intrinsic ratio', async () => {
  for (const path of ['src/components/Header.tsx', 'src/components/SiteFooter.tsx']) {
    const source = (await read(path)).toString()
    assert.match(source, /src="\/brand\/mythirumanam-logo\.png"/)
    assert.match(source, /alt="MyThirumanam"/)
    assert.match(source, /width=\{1670\}/)
    assert.match(source, /height=\{564\}/)
    assert.doesNotMatch(source, /Premium Tamil Matrimonial Platform/)
  }
})

test('file metadata replaces legacy explicit icon links and app manifest uses local approved derivatives', async () => {
  const layout = (await read('src/app/(en)/layout.tsx')).toString()
  assert.doesNotMatch(layout, /icons:\s*\{|favicon\.ico\?v=2|500x500/)
  assert.deepEqual(manifest().icons.map(({ src, sizes }) => [src, sizes]), [['/brand/mythirumanam-icon-192.png', '192x192'], ['/icon.png', '512x512']])
  await assert.rejects(read('public/mythiru-favicon.png'), { code: 'ENOENT' })
})

test('gallery brand artwork uses the approved emblem without the legacy asset', async () => {
  const gallery = (await read('src/lib/celebrations/gallery.ts')).toString()
  assert.match(gallery, /src: '\/icon.png'/)
  assert.doesNotMatch(gallery, /mythiru-favicon/)
})
