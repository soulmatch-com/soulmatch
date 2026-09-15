import { Toaster } from 'sonner'
import ConditionalHeader from '@/components/ConditionalHeader'
import ConditionalFooter from '@/components/ConditionalFooter'
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
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>
            <ConditionalHeader />
            {children}
            <ConditionalFooter />
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
