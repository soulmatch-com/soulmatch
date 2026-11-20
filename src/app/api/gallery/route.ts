import { NextRequest, NextResponse } from 'next/server'
import { getPublishedGalleryPage } from '@/lib/celebrations/gallery-repository'

export async function GET(request: NextRequest) {
  const offset = Number(request.nextUrl.searchParams.get('offset') ?? '0')
  const page = await getPublishedGalleryPage(Number.isFinite(offset) ? offset : 0)
  return NextResponse.json(page, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } })
}
