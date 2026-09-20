#!/usr/bin/env node
/**
 * Generates review artifacts only. It never connects to Supabase or applies SQL.
 * Run explicitly: node scripts/generate-blog-cms-existing-content.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { blogArticles } from '../src/content/blog/articles.ts'

const root = resolve(import.meta.dirname, '..')
const artifacts = {
  inventory: resolve(root, 'database/verification/blog-cms-existing-content-inventory.md'),
  seed: resolve(root, 'database/seeds/20260919_blog_cms_existing_articles.sql'),
  manifest: resolve(root, 'scripts/generated/blog-cms-migration-manifest.json'),
  verifier: resolve(root, 'database/verification/verify_blog_cms_existing_articles.sql'),
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function timestamp(date) {
  return `${date}T00:00:00.000Z`
}

function markdown(article) {
  const body = article.body.flatMap((section) => {
    switch (section.type) {
      case 'heading': return [`## ${section.text}`]
      case 'paragraph': return [section.text]
      case 'note': return [`**${article.locale === 'ta' ? 'குறிப்பு' : 'Content note'}:** ${section.text}`]
      case 'list': return section.items.map((item) => `- ${item}`)
      case 'comparison': return section.rows.map((row) => `**${section.headers[0]}: ${row[0]} · ${section.headers[1]}: ${row[1]} · ${section.headers[2]}: ${row[2]}**`)
      case 'faq': return section.items.flatMap((item) => [`### ${item.question}`, item.answer])
    }
  })
  const links = article.links.length ? ['', `## ${article.locale === 'ta' ? 'தொடர்புடைய இணைப்புகள்' : 'Related links'}`, ...article.links.map((link) => `- [${link.label}](${link.href})`)] : []
  const cta = article.cta ? ['', `## ${article.cta.title}`, article.cta.text, `[${article.cta.label}](${article.cta.href})`, ...(article.cta.secondaryLabel && article.cta.secondaryHref ? [`[${article.cta.secondaryLabel}](${article.cta.secondaryHref})`] : [])] : []
  return [...body, ...links, ...cta].join('\n\n')
}

function groupArticles() {
  const byLocaleSlug = new Set()
  const groups = new Map()
  for (const article of blogArticles.filter((item) => item.status === 'published')) {
    const localeSlug = `${article.locale}:${article.slug}`
    if (byLocaleSlug.has(localeSlug)) throw new Error(`Duplicate legacy ${article.locale} slug: ${article.slug}`)
    byLocaleSlug.add(localeSlug)
    const group = groups.get(article.translationKey) ?? { slug: article.slug, translationKey: article.translationKey, articles: [] }
    if (group.slug !== article.slug) throw new Error(`Ambiguous translation pair ${article.translationKey}: slugs differ`)
    group.articles.push(article)
    groups.set(article.translationKey, group)
  }
  const seenSlugs = new Set()
  for (const group of groups.values()) {
    if (seenSlugs.has(group.slug)) throw new Error(`Ambiguous legacy post slug: ${group.slug}`)
    seenSlugs.add(group.slug)
    if (new Set(group.articles.map((article) => article.locale)).size !== group.articles.length) throw new Error(`Duplicate locale in ${group.slug}`)
    for (const article of group.articles) {
      if (!article.title || article.title.length > 150) throw new Error(`CMS title constraint failed for ${article.locale}:${article.slug}`)
      if (!article.excerpt || article.excerpt.length > 500) throw new Error(`CMS excerpt constraint failed for ${article.locale}:${article.slug}`)
      if (article.seoTitle && article.seoTitle.length > 160) throw new Error(`CMS SEO title constraint failed for ${article.locale}:${article.slug}`)
      if (article.description.length > 320) throw new Error(`CMS meta description constraint failed for ${article.locale}:${article.slug}`)
    }
  }
  return [...groups.values()].sort((a, b) => a.slug.localeCompare(b.slug))
}

function toManifest(groups) {
  return groups.map((group) => ({
    slug: group.slug,
    translationKey: group.translationKey,
    postStatus: 'published',
    publishedAt: timestamp(group.articles.map((article) => article.publishedAt).sort()[0]),
    updatedAt: timestamp(group.articles.map((article) => article.updatedAt ?? article.publishedAt).sort().at(-1)),
    locales: group.articles.sort((a, b) => a.locale.localeCompare(b.locale)).map((article) => ({
      locale: article.locale,
      route: article.locale === 'en' ? `/blog/${article.slug}` : `/ta/blog/${article.slug}`,
      title: article.title,
      excerpt: article.excerpt,
      seoTitle: article.seoTitle ?? null,
      metaDescription: article.description,
      publishedAt: timestamp(article.publishedAt),
      updatedAt: timestamp(article.updatedAt ?? article.publishedAt),
      content: markdown(article),
      featuredImageUrl: null,
      featuredImageAlt: null,
    })),
  }))
}

function inventory(manifest) {
  const english = manifest.flatMap((post) => post.locales.filter((item) => item.locale === 'en'))
  const tamil = manifest.flatMap((post) => post.locales.filter((item) => item.locale === 'ta'))
  const rows = manifest.map((post) => {
    const en = post.locales.find((item) => item.locale === 'en')
    const ta = post.locales.find((item) => item.locale === 'ta')
    return `| ${post.slug} | ${en ? 'Yes — published' : 'No'} | ${ta ? 'Yes — published' : 'No'} | ${post.publishedAt} | ${en?.title ?? '—'} | ${ta?.title ?? '—'} | ${en?.seoTitle ? 'EN' : '—'} / ${ta?.seoTitle ? 'TA' : '—'} | No |`
  })
  return `# Existing blog CMS content inventory\n\nGenerated from \`src/content/blog/articles.ts\`; do not edit by hand.\n\n- English translations: ${english.length}\n- Tamil translations: ${tamil.length}\n- Logical CMS posts: ${manifest.length}\n- CMS translations: ${english.length + tamil.length}\n\n| Slug | English | Tamil | First published | English title | Tamil title | Explicit SEO title | Featured image |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\n## Mapping rules\n\n- Articles are paired only by the existing \`translationKey\`, with matching slugs.\n- All current source articles are published; each imported translation and parent post is \`published\`.\n- \`published_at\` and \`created_at\` use the earliest source publication date for the paired post.\n- \`updated_at\` uses explicit \`updatedAt\`, otherwise the source publication date.\n- Source \`description\` is the existing runtime meta-description value. Missing \`seoTitle\` remains \`NULL\`, preserving the runtime title fallback.\n- The legacy source has no featured image metadata and no author identity; image/admin fields remain \`NULL\`.\n`
}

function seed(manifest) {
  const slugs = manifest.map((post) => sql(post.slug)).join(', ')
  const preflight = `DO $$\nBEGIN\n  IF EXISTS (SELECT 1 FROM public.blog_posts WHERE slug IN (${slugs})) THEN\n    RAISE EXCEPTION 'Legacy blog CMS import conflict: one or more legacy slugs already exist. Review CMS content; this seed never overwrites it.';\n  END IF;\nEND $$;`
  const posts = manifest.map((post) => `INSERT INTO public.blog_posts (slug, status, created_at, updated_at, published_at)\nVALUES (${sql(post.slug)}, 'published', ${sql(post.publishedAt)}, ${sql(post.updatedAt)}, ${sql(post.publishedAt)});`).join('\n\n')
  const translations = manifest.flatMap((post) => post.locales.map((item) => `INSERT INTO public.blog_post_translations (post_id, locale, status, title, excerpt, content, seo_title, meta_description, published_at, created_at, updated_at)\nSELECT id, ${sql(item.locale)}, 'published', ${sql(item.title)}, ${sql(item.excerpt)}, ${sql(item.content)}, ${item.seoTitle ? sql(item.seoTitle) : 'NULL'}, ${sql(item.metaDescription)}, ${sql(item.publishedAt)}, ${sql(item.publishedAt)}, ${sql(item.updatedAt)}\nFROM public.blog_posts WHERE slug = ${sql(post.slug)};`)).join('\n\n')
  return `-- GENERATED from src/content/blog/articles.ts. REVIEW, then apply only to an approved database.\n-- This seed is intentionally conflict-safe: existing legacy slugs abort the transaction; nothing is overwritten.\nBEGIN;\n\n${preflight}\n\n${posts}\n\n${translations}\n\nCOMMIT;\n`
}

function verifier(manifest) {
  const slugs = manifest.map((post) => sql(post.slug)).join(', ')
  const expectedLocales = manifest.flatMap((post) => post.locales.map((item) => `(${sql(post.slug)}, ${sql(item.locale)})`)).join(',\n  ')
  return `-- READ-ONLY verification for the generated legacy blog CMS import. Do not modify data.\nWITH expected_posts(slug) AS (VALUES ${manifest.map((post) => `(${sql(post.slug)})`).join(', ')}),\nexpected_translations(slug, locale) AS (VALUES\n  ${expectedLocales}\n)\nSELECT\n  (SELECT count(*) FROM public.blog_posts WHERE slug IN (${slugs})) AS imported_post_count,\n  (SELECT count(*) FROM public.blog_post_translations t JOIN public.blog_posts p ON p.id = t.post_id WHERE p.slug IN (${slugs})) AS imported_translation_count,\n  (SELECT count(*) FROM expected_posts e LEFT JOIN public.blog_posts p ON p.slug = e.slug WHERE p.id IS NULL) AS missing_post_count,\n  (SELECT count(*) FROM expected_translations e LEFT JOIN public.blog_posts p ON p.slug = e.slug LEFT JOIN public.blog_post_translations t ON t.post_id = p.id AND t.locale = e.locale WHERE t.id IS NULL) AS missing_translation_count,\n  (SELECT count(*) FROM public.blog_posts WHERE slug IN (${slugs}) AND (status <> 'published' OR published_at IS NULL)) AS invalid_post_publication_count,\n  (SELECT count(*) FROM public.blog_post_translations t JOIN public.blog_posts p ON p.id = t.post_id WHERE p.slug IN (${slugs}) AND (t.status <> 'published' OR t.published_at IS NULL)) AS invalid_translation_publication_count;\n\nSELECT slug, count(*) AS duplicate_post_count\nFROM public.blog_posts WHERE slug IN (${slugs}) GROUP BY slug HAVING count(*) > 1;\n\nSELECT p.slug, t.locale, count(*) AS duplicate_translation_count\nFROM public.blog_post_translations t JOIN public.blog_posts p ON p.id = t.post_id\nWHERE p.slug IN (${slugs}) GROUP BY p.slug, t.locale HAVING count(*) > 1;\n`
}

async function writeArtifacts() {
  const manifest = toManifest(groupArticles())
  const files = {
    [artifacts.inventory]: inventory(manifest),
    [artifacts.seed]: seed(manifest),
    [artifacts.manifest]: `${JSON.stringify(manifest, null, 2)}\n`,
    [artifacts.verifier]: verifier(manifest),
  }
  for (const filename of Object.keys(files)) await mkdir(resolve(filename, '..'), { recursive: true })

  if (process.argv.includes('--check')) {
    for (const [filename, value] of Object.entries(files)) {
      if (await readFile(filename, 'utf8') !== value) throw new Error(`Generated artifact is stale: ${filename}`)
    }
    return
  }
  for (const [filename, value] of Object.entries(files)) await writeFile(filename, value)
}

await writeArtifacts()
