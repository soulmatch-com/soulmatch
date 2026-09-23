import { Facebook } from 'lucide-react'

export function FacebookShareButton({ locale, url }: { locale: 'en' | 'ta'; url: string }) {
  const label = locale === 'ta' ? 'Facebook-ல் பகிரவும்' : 'Share on Facebook'
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  return (
    <a
      href={shareUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/50 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <Facebook aria-hidden="true" className="size-4" />
      {label}
    </a>
  )
}
