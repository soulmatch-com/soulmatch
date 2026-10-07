'use client'

import { MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { businessContactLinks } from '@/lib/business-contact'

export function WhatsAppFloatingButton() {
  const pathname = usePathname()

  if (pathname?.startsWith('/admin') || !businessContactLinks.whatsappHref) return null

  return (
    <a
      href={businessContactLinks.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact MyThirumanam on WhatsApp"
      className="fixed bottom-24 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#20bd5a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#128C7E] sm:bottom-6 sm:right-6"
    >
      <MessageCircle aria-hidden="true" className="h-7 w-7" />
      <span className="sr-only">WhatsApp</span>
    </a>
  )
}
