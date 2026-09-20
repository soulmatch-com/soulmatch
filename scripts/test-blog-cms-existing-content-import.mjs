import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { blogArticles } from '../src/content/blog/articles.ts'

const manifest = JSON.parse(await readFile(new URL('./generated/blog-cms-migration-manifest.json', import.meta.url), 'utf8'))
const generator = await readFile(new URL('./generate-blog-cms-existing-content.mjs', import.meta.url), 'utf8')
const seed = await readFile(new URL('../database/seeds/20260919_blog_cms_existing_articles.sql', import.meta.url), 'utf8')
const inventory = await readFile(new URL('../database/verification/blog-cms-existing-content-inventory.md', import.meta.url), 'utf8')
const verifier = await readFile(new URL('../database/verification/verify_blog_cms_existing_articles.sql', import.meta.url), 'utf8')

const sourcePublished = blogArticles.filter((article) => article.status === 'published')
const manifestTranslations = manifest.flatMap((post) => post.locales.map((locale) => ({ ...locale, slug: post.slug })))

test('generated artifacts are deterministic and include every legacy public article exactly once', () => {
  execFileSync('node', ['scripts/generate-blog-cms-existing-content.mjs', '--check'], { stdio: 'pipe' })
  assert.equal(sourcePublished.length, 6)
  assert.equal(manifest.length, 3)
  assert.equal(manifestTranslations.length, sourcePublished.length)
  for (const article of sourcePublished) assert.ok(manifestTranslations.some((item) => item.slug === article.slug && item.locale === article.locale))
})

test('legacy locales, slugs, URLs, and existing translation pairing are preserved exactly', () => {
  for (const article of sourcePublished) {
    const migrated = manifestTranslations.find((item) => item.slug === article.slug && item.locale === article.locale)
    assert.ok(migrated)
    assert.equal(migrated.route, article.locale === 'en' ? `/blog/${article.slug}` : `/ta/blog/${article.slug}`)
  }
  for (const post of manifest) {
    const paired = sourcePublished.filter((article) => article.translationKey === post.translationKey)
    assert.ok(paired.every((article) => article.slug === post.slug))
    assert.equal(new Set(post.locales.map((item) => item.locale)).size, post.locales.length)
  }
})

test('SEO, excerpts, dates, and null fallbacks preserve current runtime semantics', () => {
  for (const article of sourcePublished) {
    const migrated = manifestTranslations.find((item) => item.slug === article.slug && item.locale === article.locale)
    assert.equal(migrated.title, article.title)
    assert.equal(migrated.excerpt, article.excerpt)
    assert.equal(migrated.seoTitle, article.seoTitle ?? null)
    assert.equal(migrated.metaDescription, article.description)
    assert.equal(migrated.publishedAt, `${article.publishedAt}T00:00:00.000Z`)
    assert.equal(migrated.updatedAt, `${(article.updatedAt ?? article.publishedAt)}T00:00:00.000Z`)
  }
  assert.ok(manifestTranslations.some((item) => item.seoTitle === null))
})

test('structured source content becomes safe Markdown while preserving headings, paragraphs, links, FAQs, and CTAs', () => {
  for (const article of sourcePublished) {
    const migrated = manifestTranslations.find((item) => item.slug === article.slug && item.locale === article.locale)
    for (const section of article.body) {
      if (section.type === 'heading') assert.match(migrated.content, new RegExp(`## ${section.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
      if (section.type === 'paragraph') assert.ok(migrated.content.includes(section.text))
      if (section.type === 'list') for (const item of section.items) assert.ok(migrated.content.includes(`- ${item}`))
      if (section.type === 'faq') for (const item of section.items) assert.ok(migrated.content.includes(`### ${item.question}`) && migrated.content.includes(item.answer))
    }
    for (const link of article.links) assert.ok(migrated.content.includes(`[${link.label}](${link.href})`))
    assert.ok(migrated.content.includes(`[${article.cta.label}](${article.cta.href})`))
    assert.doesNotMatch(migrated.content, /<script\b|javascript:/i)
  }
})

test('seed is explicit-only, non-destructive, conflict-safe, and leaves admin identities null', () => {
  assert.match(seed, /GENERATED from src\/content\/blog\/articles\.ts/)
  assert.match(seed, /BEGIN;/)
  assert.match(seed, /RAISE EXCEPTION 'Legacy blog CMS import conflict/)
  assert.match(seed, /COMMIT;/)
  assert.doesNotMatch(seed, /\b(?:TRUNCATE|DELETE\s+FROM|UPDATE\s+public\.)\b/i)
  assert.doesNotMatch(seed, /created_by|updated_by/)
  assert.doesNotMatch(generator, /createAdminClient|fetch\(/i)
})

test('all imported public locales and posts are published with original first-publication timestamps', () => {
  assert.equal((seed.match(/'published'/g) ?? []).length, 9)
  for (const post of manifest) {
    assert.ok(seed.includes(`'${post.slug}'`))
    assert.ok(seed.includes(post.publishedAt))
  }
})

test('inventory and read-only verifier represent expected counts, slugs, locales, and publication checks', () => {
  assert.match(inventory, /English translations: 3/)
  assert.match(inventory, /Tamil translations: 3/)
  assert.match(inventory, /Logical CMS posts: 3/)
  assert.match(inventory, /CMS translations: 6/)
  for (const post of manifest) assert.ok(verifier.includes(post.slug))
  assert.match(verifier, /invalid_post_publication_count/)
  assert.match(verifier, /invalid_translation_publication_count/)
  assert.doesNotMatch(verifier, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP)\b/i)
})
