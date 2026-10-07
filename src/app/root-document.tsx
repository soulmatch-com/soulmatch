import { Toaster } from 'sonner'
import ConditionalHeader from '@/components/ConditionalHeader'
import ConditionalFooter from '@/components/ConditionalFooter'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'

export function RootDocument({
  children,
  language,
}: Readonly<{
  children: React.ReactNode
  language: 'en' | 'ta'
}>) {
  return (
    <html lang={language}>
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>
            <ConditionalHeader />
            {children}
            <ConditionalFooter />
            <WhatsAppFloatingButton />
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
