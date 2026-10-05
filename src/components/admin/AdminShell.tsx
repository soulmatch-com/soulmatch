'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import AdminHeader from '@/components/admin/AdminHeader'
import { adminNavigation } from '@/components/admin/AdminSidebarNavigation'

const moduleHeaders: Record<string, { eyebrow: string; title: string; description: string }> = {
  '/admin/dashboard': { eyebrow: 'Admin workspace', title: 'Dashboard', description: 'Monitor activity and manage the platform from one place.' },
  '/admin/users': { eyebrow: 'Account management', title: 'Users', description: 'Review and manage registered user accounts.' },
  '/admin/profiles': { eyebrow: 'Profile management', title: 'Profiles', description: 'Review member profiles and their information.' },
  '/admin/active-profiles': { eyebrow: 'Profile management', title: 'Active Profiles', description: 'View profiles currently active on the platform.' },
  '/admin/verification-queue': { eyebrow: 'Profile management', title: 'Verification Queue', description: 'Review profiles awaiting verification.' },
  '/admin/success-stories': { eyebrow: 'Content management', title: 'Success Stories', description: 'Create and manage published success stories.' },
  '/admin/leads': { eyebrow: 'Customer workspace', title: 'Leads', description: 'Track celebration enquiries and follow-up activity.' },
  '/admin/quotations': { eyebrow: 'Commercial workspace', title: 'Quotations', description: 'Create, review, and manage quotations from the complete list.' },
  '/admin/celebration-services': { eyebrow: 'Catalogue management', title: 'Celebration Services', description: 'Manage services available for enquiries and quotations.' },
  '/admin/blogs': { eyebrow: 'Content management', title: 'Blog Management', description: 'Create, publish, and manage planning guides.' },
  '/admin/settings': { eyebrow: 'Admin workspace', title: 'Settings', description: 'Manage account and workspace settings.' },
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const currentModule = [...adminNavigation].sort(([left], [right]) => right.length - left.length).find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] ?? 'Admin'
  const matchingPath = Object.keys(moduleHeaders).sort((left, right) => right.length - left.length).find((path) => pathname === path || pathname.startsWith(`${path}/`))
  const header = matchingPath ? moduleHeaders[matchingPath] : { eyebrow: 'MyThirumanam Admin', title: currentModule, description: 'Celebration and matrimony workspace' }
  return <div className="min-h-screen bg-slate-50"><AdminHeader collapsed={collapsed} onToggleCollapse={() => setCollapsed((value) => !value)} /><main className={collapsed ? 'md:pl-20' : 'md:pl-64'}><header className="hidden min-h-20 items-center border-b border-slate-200 bg-white px-8 py-4 md:flex"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{header.eyebrow}</p><p className="mt-1 text-xl font-semibold text-slate-900">{header.title}</p><p className="mt-1 text-sm text-slate-500">{header.description}</p></div></header>{children}</main></div>
}
