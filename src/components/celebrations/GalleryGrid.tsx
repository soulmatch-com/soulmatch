import Image from 'next/image'
import type { CelebrationGalleryItem } from '@/lib/celebrations/gallery'

export function GalleryGrid({ items }: { items: readonly CelebrationGalleryItem[] }) {
  if (items.length === 0) return null

  return (
    <ul aria-label="Gallery images" className={items.length === 1
      ? 'mx-auto grid w-full max-w-sm grid-cols-1 gap-6'
      : 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
      {items.map((item) => (
        <li key={item.id} className="min-w-0 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <figure>
            <div className="relative aspect-square bg-white">
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                sizes={items.length === 1
                  ? '(max-width: 415px) calc(100vw - 32px), 384px'
                  : '(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc((100vw - 72px) / 2), 368px'}
                loading="lazy"
                className={`h-full w-full ${item.kind === 'brand-art' ? 'object-contain p-6' : 'object-cover'}`}
              />
            </div>
            <figcaption className="border-t border-amber-100 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-800">{item.category}</p>
              <h3 className="mt-2 text-xl font-bold text-stone-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">{item.caption}</p>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}
