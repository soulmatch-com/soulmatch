import Image from 'next/image'
import Link from 'next/link'

const celebrationLinks = [['Home', '/'], ['60th Marriage', '/60th-marriage'], ['70th Marriage', '/70th-marriage'], ['80th Marriage', '/80th-marriage'], ['Plan Celebration', '/plan']] as const
const matrimonyLinks = [['Explore Matrimony', '/matrimony'], ['Find Matches', '/search'], ['Create Profile', '/signup'], ['Member Login', '/login']] as const

export function SiteFooter() {
  return <footer className="border-t border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3"><div><Link href="/" className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"><Image src="/mythirumanam-logo.png" alt="MyThirumanam" width={220} height={65} className="h-10 w-auto" /></Link><p className="mt-4 max-w-sm text-sm leading-6">Plan traditional marriage milestone celebrations in Thirukadaiyur, with a separate matrimonial service for families seeking life partners.</p></div><FooterLinks heading="Celebrations" links={celebrationLinks} tone="amber" /><FooterLinks heading="Matrimony" links={matrimonyLinks} tone="blue" /></div><div className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-500 dark:border-slate-800">© {new Date().getFullYear()} MyThirumanam. Celebrations and Matrimony are separate customer journeys.</div></footer>
}

export default SiteFooter

function FooterLinks({ heading, links, tone }: { heading: string; links: ReadonlyArray<readonly [string, string]>; tone: 'amber' | 'blue' }) {
  const headingId = `footer-${heading.toLowerCase()}-heading`
  const focus = tone === 'amber' ? 'hover:text-amber-800 focus-visible:outline-amber-700 dark:hover:text-amber-300' : 'hover:text-blue-700 focus-visible:outline-blue-700 dark:hover:text-blue-300'
  return <nav aria-labelledby={headingId}><h2 id={headingId} className="font-bold text-slate-900 dark:text-white">{heading}</h2><ul className="mt-4 space-y-3 text-sm">{links.map(([label, href]) => <li key={href}><Link className={`focus-visible:outline-2 focus-visible:outline-offset-2 ${focus}`} href={href}>{label}</Link></li>)}</ul></nav>
}
