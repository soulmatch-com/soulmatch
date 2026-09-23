'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react'
import { IndependentServiceNotice } from '@/components/celebrations/IndependentServiceNotice'
import { businessContact, businessContactLinks, businessSocialLinks } from '@/lib/business-contact'

const celebrationLinks = [['Home', '/'], ['60th Marriage', '/60th-marriage'], ['70th Marriage', '/70th-marriage'], ['80th Marriage', '/80th-marriage'], ['Gallery', '/gallery'], ['Blog', '/blog'], ['Plan Celebration', '/plan']] as const
const companyLinks = [['About Us', '/about'], ['Terms & Conditions', '/terms'], ['Privacy Policy', '/privacy'], ['Contact & Grievance', '/contact']] as const
const INITIAL_COPYRIGHT_YEAR = 2026

export function SiteFooter() {
  const hasContactDetails = businessContact.bookingsEmail || businessContactLinks.callHref || businessContactLinks.whatsappHref

  return <footer className="border-t border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-2 lg:grid-cols-4"><div><Link href="/" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"><Image src="/brand/mythirumanam-logo.png" alt="MyThirumanam" width={1690} height={859} sizes="210px" className="h-auto w-[210px] max-w-full" /></Link><p className="mt-3 max-w-sm text-sm leading-6">Plan traditional marriage milestone celebrations in Thirukadaiyur with family-focused planning support.</p><IndependentServiceNotice className="mt-3 max-w-sm text-xs text-slate-500 dark:text-slate-400" /></div><FooterLinks heading="Celebrations" links={celebrationLinks} /><FooterLinks heading="Company" links={companyLinks} />{hasContactDetails ? <div><FooterContact /><SocialLinks /></div> : <SocialLinks />}</div><div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-800">© {INITIAL_COPYRIGHT_YEAR} MyThirumanam.</div></footer>
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

function SocialLinks() {
  const links = [
    ['Instagram', businessSocialLinks.instagram, Instagram],
    ['Facebook', businessSocialLinks.facebook, Facebook],
    ['YouTube', businessSocialLinks.youtube, Youtube],
    ['LinkedIn', businessSocialLinks.linkedin, Linkedin],
    ['X', businessSocialLinks.x, Twitter],
  ] as const
  const availableLinks = links.filter(([, href]) => href)

  if (!availableLinks.length) return null

  return <nav aria-label="Follow MyThirumanam" className="text-center lg:text-left"><p className="text-sm font-semibold text-slate-900 dark:text-white">Follow us</p><ul className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start">{availableLinks.map(([label, href, Icon]) => <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Follow MyThirumanam on ${label}`} className="inline-flex size-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:border-amber-700 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-300 dark:hover:bg-slate-900 dark:hover:text-amber-300"><Icon aria-hidden="true" className="size-4" /></a></li>)}</ul></nav>
}
