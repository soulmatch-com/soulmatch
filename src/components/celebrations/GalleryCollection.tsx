'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { GalleryGrid } from '@/components/celebrations/GalleryGrid'
import type { CelebrationGalleryItem } from '@/lib/celebrations/gallery'

export function GalleryCollection({ initialItems, initialHasMore }: { initialItems: CelebrationGalleryItem[]; initialHasMore: boolean }) {
  const [items, setItems] = useState(initialItems)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    try {
      const response = await fetch(`/api/gallery?offset=${items.length}`)
      if (!response.ok) throw new Error('Unable to load more photographs.')
      const page = await response.json() as { items: Array<{ id: string; image_url: string; alt_text: string; title: string; caption: string; category: string; width: number; height: number }>; hasMore: boolean }
      setItems((current) => [...current, ...page.items.map((item) => ({ id: item.id, src: item.image_url, alt: item.alt_text, title: item.title, caption: item.caption, category: item.category, width: item.width, height: item.height, publicationType: 'approved-event-photo' as const }))])
      setHasMore(page.hasMore)
    } finally { setLoading(false) }
  }

  return <div className="space-y-8"><GalleryGrid items={items} />{hasMore && <div className="text-center"><button type="button" onClick={() => void loadMore()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-700 px-5 py-2 font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-60">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}{loading ? 'Loading photographs…' : 'Load more photographs'}</button></div>}</div>
}
