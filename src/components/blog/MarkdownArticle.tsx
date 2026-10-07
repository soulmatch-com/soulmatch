import type { ReactNode } from 'react'

import Link from 'next/link'

function safeHref(value: string) {
  return /^(\/|https:\/\/mythirumanam\.in\/)/.test(value) ? value : null
}

function inline(text: string) {
  return text.split(/(\[[^\]]+\]\([^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]*)\)$/)
    if (link) {
      const href = safeHref(link[2])
      return href ? <Link key={index} href={href} className="font-semibold text-amber-800 underline">{link[1]}</Link> : <span key={index}>{link[1]}</span>
    }
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    return part
  })
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function isTableDivider(line: string) {
  const cells = splitTableRow(line)
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function tableAlignment(cell: string): 'left' | 'center' | 'right' {
  if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
  if (cell.endsWith(':')) return 'right'
  return 'left'
}

function renderTable(lines: string[], start: number) {
  const headers = splitTableRow(lines[start])
  const divider = splitTableRow(lines[start + 1])
  const rows: string[][] = []
  let next = start + 2

  while (next < lines.length && lines[next].includes('|') && lines[next].trim()) {
    rows.push(splitTableRow(lines[next]).slice(0, headers.length))
    next += 1
  }

  return {
    next,
    node: <div key={start} className="overflow-x-auto rounded-lg border border-amber-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-amber-50 text-stone-900">
          <tr>{headers.map((header, index) => <th key={index} scope="col" className="border-b border-amber-200 px-4 py-3 font-semibold" style={{ textAlign: tableAlignment(divider[index] ?? '') }}>{inline(header)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-amber-100 bg-white text-stone-700">
          {rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top leading-6" style={{ textAlign: tableAlignment(divider[cellIndex] ?? '') }}>{inline(row[cellIndex] ?? '')}</td>)}</tr>)}
        </tbody>
      </table>
    </div>,
  }
}

export function MarkdownArticle({ content }: { content: string }) {
  const lines = content.replace(/<[^>]*>/g, '').split('\n')
  const nodes: ReactNode[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.startsWith('```')) {
      const code: string[] = []
      const language = line.slice(3).trim()
      let next = index + 1

      while (next < lines.length && !lines[next].startsWith('```')) {
        code.push(lines[next])
        next += 1
      }

      if (next < lines.length) {
        nodes.push(<pre key={index} className="overflow-x-auto rounded-lg border border-stone-200 bg-stone-950 p-4 text-sm leading-6 text-stone-100"><code data-language={language || undefined}>{code.join('\n')}</code></pre>)
        index = next
      } else {
        nodes.push(<p key={index} className="leading-8 text-stone-700">{inline(line)}</p>)
      }
    } else if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      nodes.push(<hr key={index} className="border-0 border-t border-stone-200" />)
    } else if (lines[index + 1] && line.includes('|') && isTableDivider(lines[index + 1])) {
      const table = renderTable(lines, index)
      nodes.push(table.node)
      index = table.next - 1
    } else if (line.startsWith('### ')) nodes.push(<h3 key={index} className="text-xl font-bold">{inline(line.slice(4))}</h3>)
    else if (line.startsWith('## ')) nodes.push(<h2 key={index} className="text-2xl font-bold">{inline(line.slice(3))}</h2>)
    else if (line.startsWith('# ')) nodes.push(<h1 key={index} className="text-3xl font-bold">{inline(line.slice(2))}</h1>)
    else if (line.startsWith('- ')) nodes.push(<li key={index} className="ml-6 list-disc">{inline(line.slice(2))}</li>)
    else if (line) nodes.push(<p key={index} className="leading-8 text-stone-700">{inline(line)}</p>)
  }

  return <div className="space-y-5">{nodes}</div>
}
