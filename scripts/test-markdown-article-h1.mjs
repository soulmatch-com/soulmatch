import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { getMarkdownHeadingLevels, parseMarkdownArticleBlocks } from '../src/components/blog/markdown-article.ts'

const renderer = await readFile(new URL('../src/components/blog/MarkdownArticle.tsx', import.meta.url), 'utf8')

const headingBlocks = (content) => parseMarkdownArticleBlocks(content).filter((block) => block.type === 'heading')

test('a page title plus one body H1 produces exactly one H1 and converts the body heading to H2', () => {
  const completePageHeadings = [{ type: 'heading', level: 1, text: 'Page title' }, ...headingBlocks('# Body title')]
  assert.equal(completePageHeadings.filter((heading) => heading.level === 1).length, 1)
  assert.deepEqual(completePageHeadings[1], { type: 'heading', level: 2, text: 'Body title' })
})

test('every body H1 becomes H2', () => {
  assert.deepEqual(headingBlocks('# First\n# Second'), [
    { type: 'heading', level: 2, text: 'First' },
    { type: 'heading', level: 2, text: 'Second' },
  ])
})

test('body content without an H1 remains unchanged', () => {
  assert.deepEqual(parseMarkdownArticleBlocks('## Section\nParagraph\n### Detail\n#### Fine detail'), [
    { type: 'heading', level: 2, text: 'Section' },
    { type: 'paragraph', text: 'Paragraph' },
    { type: 'heading', level: 3, text: 'Detail' },
    { type: 'heading', level: 4, text: 'Fine detail' },
  ])
})

test('Tamil and English heading text, links, IDs, and body-heading styling are preserved', () => {
  const [heading] = headingBlocks('# திருமண செலவு [Planning guide](/blog/guide) {#cost-planning}')
  assert.deepEqual(heading, {
    type: 'heading',
    level: 2,
    text: 'திருமண செலவு [Planning guide](/blog/guide)',
    id: 'cost-planning',
  })
  assert.match(renderer, /<h2 key=\{index\} id=\{heading\.id\} className="text-3xl font-bold">\{inline\(heading\.text\)\}<\/h2>/)
  assert.doesNotMatch(renderer, /<h1 key=\{index\}/)
})

test('the CMS heading restriction allows only H2 through H4 outside fenced code blocks', () => {
  assert.deepEqual(getMarkdownHeadingLevels('## Section\n### Detail\n#### Fine detail\n```md\n# Example syntax\n```'), [2, 3, 4])
  assert.deepEqual(getMarkdownHeadingLevels('# Body title\n##### Too deep'), [1, 5])
})
