import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Approved artwork only: crop and Lanczos resize; no redrawing or color changes.
const root = new URL('../', import.meta.url)
const source = await readFile(new URL('assets/brand/839F3D1B-38F3-439C-9C7F-1CA730683B61.png', root))
const full = { left: 64, top: 122, width: 1670, height: 564 }
const emblem = { left: 64, top: 122, width: 526, height: 564 }

await writeFile(new URL('public/brand/mythirumanam-logo.png', root), await sharp(source).extract(full).png().toBuffer())
const cropped = await sharp(source).extract(emblem).png().toBuffer()
async function icon(size, padding = 0.04) {
  const inset = Math.max(1, Math.round(size * padding))
  return sharp(cropped).resize(size - inset * 2, size - inset * 2, {
    fit: 'contain', background: '#00000000', kernel: 'lanczos3', withoutEnlargement: true,
  }).extend({ top: inset, bottom: inset, left: inset, right: inset, background: '#00000000' }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
}

await writeFile(new URL('src/app/icon.png', root), await icon(512))
await writeFile(new URL('src/app/apple-icon.png', root), await icon(180, 0.1))
await writeFile(new URL('public/brand/mythirumanam-icon-192.png', root), await icon(192))

// ICO embeds PNG frames at native favicon resolutions.
const sizes = [16, 32, 48]
const frames = await Promise.all(sizes.map((size) => icon(size)))
const directory = Buffer.alloc(6 + sizes.length * 16)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
frames.forEach((frame, index) => {
  const entry = 6 + index * 16
  directory[entry] = sizes[index]
  directory[entry + 1] = sizes[index]
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(frame.length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += frame.length
})
await writeFile(new URL('src/app/favicon.ico', root), Buffer.concat([directory, ...frames]))
console.log('Generated approved horizontal logo, 16/32/48 ICO, 180 Apple, 192 and 512 icons.')
