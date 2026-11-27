import { getPublicBlogPosts } from '@/lib/blog/public-blog-source'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const locale = params.get('locale')
  const page = Number(params.get('page'))
  if ((locale !== 'en' && locale !== 'ta') || !Number.isSafeInteger(page) || page < 1 || page > 10000) {
    return Response.json({ error: 'Invalid pagination parameters.' }, { status: 400 })
  }

  try {
    return Response.json(await getPublicBlogPosts(locale, { page }))
  } catch {
    return Response.json({ error: 'Unable to load blogs.' }, { status: 500 })
  }
}
