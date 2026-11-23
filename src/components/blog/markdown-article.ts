export type MarkdownArticleBlock =
  | { type: 'heading'; level: 2 | 3 | 4; text: string; id?: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list-item'; text: string }

type ParsedHeading = {
  level: 1 | 2 | 3 | 4
  text: string
  id?: string
}

/**
 * Parses the Markdown heading syntax accepted by article content. The page
 * template owns the document H1, so a body level-one heading is represented as
 * a level-two block for rendering.
 */
export function parseMarkdownHeading(line: string): ParsedHeading | null {
  const match = /^(#{1,4})\s+(.+?)\s*$/.exec(line)
  if (!match) return null

  const idMatch = /\s+\{#([^{}\s]+)\}$/.exec(match[2])
  return {
    level: match[1].length as ParsedHeading['level'],
    text: idMatch ? match[2].slice(0, idMatch.index).trimEnd() : match[2],
    ...(idMatch ? { id: idMatch[1] } : {}),
  }
}

export function getMarkdownHeadingLevels(content: string): number[] {
  const levels: number[] = []
  let insideCodeFence = false

  for (const line of content.split('\n')) {
    if (line.startsWith('```')) {
      insideCodeFence = !insideCodeFence
      continue
    }
    if (insideCodeFence) continue
    const heading = /^(#{1,6})\s+/.exec(line)
    if (heading) levels.push(heading[1].length)
  }

  return levels
}

export function parseMarkdownArticleBlocks(content: string): MarkdownArticleBlock[] {
  return content.split('\n').flatMap((line) => {
    const heading = parseMarkdownHeading(line)
    if (heading) {
      return [{
        type: 'heading' as const,
        level: heading.level === 1 ? 2 : heading.level,
        text: heading.text,
        ...(heading.id ? { id: heading.id } : {}),
      }]
    }
    if (line.startsWith('- ')) return [{ type: 'list-item' as const, text: line.slice(2) }]
    return line ? [{ type: 'paragraph' as const, text: line }] : []
  })
}
