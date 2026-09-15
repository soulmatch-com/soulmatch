import type { Metadata } from 'next'

const title = 'Thirukadaiyur Marriage Celebrations | MyThirumanam'
const description = 'Plan traditional 60th, 70th and 80th marriage celebrations in Thirukadaiyur, with Matrimony available as a dedicated secondary service.'
const socialImage = {
  url: '/brand/mythirumanam-logo.png',
  width: 1690,
  height: 859,
  alt: 'MyThirumanam',
}

export const rootMetadata: Metadata = {
  metadataBase: new URL('https://mythirumanam.in'),
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://mythirumanam.in',
    siteName: 'MyThirumanam',
    type: 'website',
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    images: [socialImage],
  },
  // Next.js file metadata supplies favicon.ico, icon.png, apple-icon.png and manifest.ts.
}
