'use client'

import Image from 'next/image'
import Link from 'next/link'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'
import { businessContact, businessContactLinks } from '@/lib/business-contact'

const celebrationLinks = [['Home', '/'], ['60th Marriage', '/60th-marriage'], ['70th Marriage', '/70th-marriage'], ['80th Marriage', '/80th-marriage'], ['Gallery', '/gallery'], ['Blog', '/blog'], ['Plan Celebration', '/plan']] as const
const companyLinks = [['About Us', '/about'], ['Terms & Conditions', '/terms'], ['Privacy Policy', '/privacy'], ['Contact & Grievance', '/contact']] as const
const INITIAL_COPYRIGHT_YEAR = 2026

export function SiteFooter() {
  const hasContactDetails = businessContact.bookingsEmail || businessContactLinks.callHref || businessContactLinks.whatsappHref

  return <footer className="border-t border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4"><div><Link href="/" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"><Image src="/brand/mythirumanam-logo.png" alt="MyThirumanam" width={1690} height={859} sizes="210px" className="h-auto w-[210px] max-w-full" /></Link><p className="mt-4 max-w-sm text-sm leading-6">Plan traditional marriage milestone celebrations in Thirukadaiyur with family-focused planning support.</p><IndependentServiceNotice className="mt-4 max-w-sm text-xs text-slate-500 dark:text-slate-400" /></div><FooterLinks heading="Celebrations" links={celebrationLinks} /><FooterLinks heading="Company" links={companyLinks} />{hasContactDetails && <FooterContact />}</div><div className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-800">© {INITIAL_COPYRIGHT_YEAR} MyThirumanam.</div></footer>
}

export default SiteFooter

function FooterLinks({ heading, links }: { heading: string; links: ReadonlyArray<readonly [string, string]> }) {
  const headingId = `footer-${heading.toLowerCase()}-heading`
  const focus = 'hover:text-amber-800 focus-visible:outline-amber-700 dark:hover:text-amber-300'
  return <nav aria-labelledby={headingId}><h2 id={headingId} className="font-bold text-slate-900 dark:text-white">{heading}</h2><ul className="mt-4 space-y-3 text-sm">{links.map(([label, href]) => <li key={href}><Link className={`focus-visible:outline-2 focus-visible:outline-offset-2 ${focus}`} href={href}>{label}</Link></li>)}</ul></nav>
}

function FooterContact() {
  const focus = 'hover:text-amber-800 focus-visible:outline-amber-700 dark:hover:text-amber-300'
  return <address className="not-italic"><h2 className="font-bold text-slate-900 dark:text-white">Contact</h2><ul className="mt-4 space-y-3 text-sm">{businessContactLinks.whatsappHref && <li><a href={businessContactLinks.whatsappHref} target="_blank" rel="noopener noreferrer" className={`focus-visible:outline-2 focus-visible:outline-offset-2 ${focus}`}>WhatsApp MyThirumanam</a></li>}{businessContactLinks.callHref && <li><a href={businessContactLinks.callHref} className={`focus-visible:outline-2 focus-visible:outline-offset-2 ${focus}`}>Call {businessContactLinks.phoneDisplay ?? 'MyThirumanam'}</a></li>}{businessContact.bookingsEmail && <li><a href={`mailto:${businessContact.bookingsEmail}`} className={`break-words focus-visible:outline-2 focus-visible:outline-offset-2 ${focus}`}>{businessContact.bookingsEmail}</a></li>}</ul></address>
}
