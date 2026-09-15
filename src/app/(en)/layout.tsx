import type { Metadata } from 'next'
import { rootMetadata } from '../root-metadata'
import { RootDocument } from '../root-document'
import '../globals.css'

export const metadata: Metadata = rootMetadata

export default function EnglishRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <RootDocument language="en">{children}</RootDocument>
}
