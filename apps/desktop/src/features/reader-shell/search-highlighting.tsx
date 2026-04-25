import type { QueryNode } from "@freelyrss/shared-query"
import type { ArticleDetailDto, ArticleListItemDto } from "@freelyrss/shared-types"
import type { ReactNode } from "react"

export interface TextHighlightRange {
  end: number
  start: number
}

function normalizeHighlightTerms(terms: string[]) {
  return Array.from(
    new Set(terms.map((term) => term.trim()).filter((term) => term.length > 0)),
  ).sort((left, right) => right.length - left.length || left.localeCompare(right))
}

function collectSearchHighlightTerms(node: QueryNode, terms: string[], negated: boolean) {
  if (node.kind === "group") {
    for (const child of node.children) {
      collectSearchHighlightTerms(child, terms, negated)
    }

    return
  }

  if (node.kind === "not") {
    collectSearchHighlightTerms(node.child, terms, true)
    return
  }

  if (negated) {
    return
  }

  if (
    (node.field === "anyText" || node.field === "content") &&
    (node.operator === "contains" || node.operator === "eq") &&
    typeof node.value === "string"
  ) {
    terms.push(node.value)
  }
}

export function extractSearchHighlightTerms(root: QueryNode | null) {
  if (!root) {
    return []
  }

  const terms: string[] = []
  collectSearchHighlightTerms(root, terms, false)
  return normalizeHighlightTerms(terms)
}

export function findTextHighlightRanges(text: string, terms: string[]): TextHighlightRange[] {
  if (text.length === 0) {
    return []
  }

  const normalizedTerms = normalizeHighlightTerms(terms)

  if (normalizedTerms.length === 0) {
    return []
  }

  const lowercaseText = text.toLowerCase()
  const candidates: TextHighlightRange[] = []

  for (const term of normalizedTerms) {
    const lowercaseTerm = term.toLowerCase()
    let searchStart = 0

    while (searchStart < lowercaseText.length) {
      const index = lowercaseText.indexOf(lowercaseTerm, searchStart)

      if (index === -1) {
        break
      }

      candidates.push({
        start: index,
        end: index + lowercaseTerm.length,
      })
      searchStart = index + lowercaseTerm.length
    }
  }

  candidates.sort(
    (left, right) => left.start - right.start || right.end - left.end || left.end - right.end,
  )

  const ranges: TextHighlightRange[] = []

  for (const candidate of candidates) {
    const previousRange = ranges.at(-1)

    if (!previousRange || candidate.start >= previousRange.end) {
      ranges.push(candidate)
    }
  }

  return ranges
}

function normalizeSnippetSource(text: string) {
  return text.replace(/\s+/gu, " ").trim()
}

function moveToWordBoundary(text: string, index: number, direction: "backward" | "forward") {
  let cursor = index

  if (direction === "backward") {
    while (cursor > 0 && !/\s/u.test(text[cursor - 1] ?? "")) {
      cursor -= 1
    }

    return cursor
  }

  while (cursor < text.length && !/\s/u.test(text[cursor] ?? "")) {
    cursor += 1
  }

  return cursor
}

function applyHighlightMarkup(text: string, ranges: TextHighlightRange[]) {
  if (ranges.length === 0) {
    return text
  }

  let cursor = 0
  let output = ""

  for (const range of ranges) {
    if (range.end <= range.start || range.start < cursor) {
      continue
    }

    if (range.start > cursor) {
      output += text.slice(cursor, range.start)
    }

    output += `<mark>${text.slice(range.start, range.end)}</mark>`
    cursor = range.end
  }

  if (cursor < text.length) {
    output += text.slice(cursor)
  }

  return output
}

function buildSearchSnippet(text: string, terms: string[]) {
  const normalizedText = normalizeSnippetSource(text)

  if (normalizedText.length === 0) {
    return null
  }

  const ranges = findTextHighlightRanges(normalizedText, terms)

  if (ranges.length === 0) {
    return null
  }

  const firstRange = ranges[0]
  const windowStart = moveToWordBoundary(
    normalizedText,
    Math.max(0, firstRange.start - 54),
    "backward",
  )
  const windowEnd = moveToWordBoundary(
    normalizedText,
    Math.min(normalizedText.length, firstRange.end + 54),
    "forward",
  )
  const snippetText = normalizedText.slice(windowStart, windowEnd)
  const localRanges = ranges
    .filter((range) => range.end > windowStart && range.start < windowEnd)
    .map((range) => ({
      start: Math.max(0, range.start - windowStart),
      end: Math.min(snippetText.length, range.end - windowStart),
    }))

  if (snippetText.length === 0 || localRanges.length === 0) {
    return null
  }

  return `${windowStart > 0 ? "... " : ""}${applyHighlightMarkup(snippetText, localRanges)}${
    windowEnd < normalizedText.length ? " ..." : ""
  }`
}

export function buildArticleSearchSnippet(
  article: ArticleListItemDto,
  detail: ArticleDetailDto | null,
  terms: string[],
) {
  const normalizedTerms = normalizeHighlightTerms(terms)

  if (normalizedTerms.length === 0) {
    return null
  }

  const candidates = [
    detail?.article.contentExtracted ?? null,
    detail?.article.summary ?? article.summary,
    detail?.article.title ?? article.title,
    detail?.article.contentRaw ?? null,
  ]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    const snippet = buildSearchSnippet(candidate, normalizedTerms)

    if (snippet) {
      return snippet
    }
  }

  return null
}

export function renderMarkedText(markup: string, className: string): ReactNode {
  if (!markup.includes("<mark>")) {
    return markup
  }

  const fragments: ReactNode[] = []
  const tokens = markup.split(/(<mark>|<\/mark>)/g).filter((token) => token.length > 0)
  let insideMark = false
  let markKey = 0

  for (const token of tokens) {
    if (token === "<mark>") {
      insideMark = true
      continue
    }

    if (token === "</mark>") {
      insideMark = false
      continue
    }

    if (!insideMark) {
      fragments.push(token)
      continue
    }

    fragments.push(
      <mark className={className} key={`marked-text-${markKey}`}>
        {token}
      </mark>,
    )
    markKey += 1
  }

  return fragments
}
