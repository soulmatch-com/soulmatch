'use client'

import { usePathname } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'

export default function ConditionalFooter() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <SiteFooter />
}
