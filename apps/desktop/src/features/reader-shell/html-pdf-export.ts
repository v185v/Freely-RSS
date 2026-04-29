import type { AnnotationDto, ArticleDetailDto, AttachmentDto } from "@freelyrss/shared-types"

import { buildDocumentCss } from "./document-export-styles"
import type {
  ReaderContentMode,
  ReaderDocumentExportFormat,
  ReaderDocumentExportMode,
  ReaderDocumentExportPresentation,
  ReaderDocumentExportResult,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderMarginMode,
  ReaderThemeTone,
} from "./types"

type BuildReaderDocumentExportInput = {
  details: ArticleDetailDto[]
  format: ReaderDocumentExportFormat
  generatedAt?: string
  mode: ReaderDocumentExportMode
  presentation: ReaderDocumentExportPresentation
  title?: string
}

type ExtractedAnchor = {
  contentMode: "extracted"
  endOffset: number
  paragraphIndex: number
  startOffset: number
}

type AnnotationRange = {
  annotation: AnnotationDto
  endOffset: number
  startOffset: number
}

function normalizeMultilineText(value: string | null | undefined) {
  return value?.replace(/\r\n?/g, "\n").trim() ?? ""
}

function normalizeInlineText(value: string | null | undefined, fallback = "Unknown") {
  const normalized = normalizeMultilineText(value).replace(/\s+/g, " ")
  return normalized.length > 0 ? normalized : fallback
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;")
}

function buildDocumentTitle(value: string) {
  const normalized = normalizeInlineText(value, "Untitled article").replace(/^#+\s*/, "")
  return normalized.length > 0 ? normalized : "Untitled article"
}

function buildSlugSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized.length > 0 ? normalized : "article"
}

function buildExportTimestampSlug(value: string) {
  return value.replace(/[:.]/g, "-")
}

function buildFileName(input: {
  details: ArticleDetailDto[]
  format: ReaderDocumentExportFormat
  generatedAt: string
  mode: ReaderDocumentExportMode
  title: string
}) {
  const extension = input.format === "pdf" ? "pdf" : "html"

  if (input.mode === "single") {
    const detail = input.details[0]
    return `${buildSlugSegment(detail?.article.title ?? input.title)}.${extension}`
  }

  return `${buildSlugSegment(input.title)}-${buildExportTimestampSlug(input.generatedAt)}.${extension}`
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no"
}

function formatNullable(value: string | null | undefined) {
  const normalized = normalizeInlineText(value, "")
  return normalized.length > 0 ? normalized : "Not available"
}

function formatTags(detail: ArticleDetailDto) {
  return detail.tags.length > 0
    ? detail.tags.map((tag) => normalizeInlineText(tag.name)).join(", ")
    : "None"
}

function formatAnnotationType(type: AnnotationDto["type"]) {
  switch (type) {
    case "highlight":
      return "Highlight"
    case "note":
      return "Note"
    default:
      return "Comment"
  }
}

function formatAttachmentLabel(attachment: AttachmentDto) {
  const facts = [
    attachment.mimeType ? `mime: ${attachment.mimeType}` : null,
    typeof attachment.size === "number" ? `size: ${attachment.size} bytes` : null,
    typeof attachment.duration === "number" ? `duration: ${attachment.duration} seconds` : null,
    attachment.localCachePath ? `local cache: ${attachment.localCachePath}` : null,
  ].filter((fact): fact is string => fact !== null)

  return facts.length > 0 ? facts.join("; ") : "metadata unavailable"
}

function formatReaderContentMode(value: ReaderContentMode) {
  return value === "raw" ? "Original content" : "Extracted content"
}

function formatReaderThemeTone(value: ReaderThemeTone) {
  switch (value) {
    case "daylight":
      return "Daylight"
    case "high-contrast":
      return "High contrast"
    default:
      return "Midnight"
  }
}

function formatReaderFontFamily(value: ReaderFontFamily) {
  switch (value) {
    case "editorial":
      return "Editorial"
    case "technical":
      return "Technical"
    default:
      return "Sans"
  }
}

function formatReaderFontScale(value: ReaderFontScale) {
  switch (value) {
    case "compact":
      return "Compact"
    case "large":
      return "Large"
    default:
      return "Comfortable"
  }
}

function formatReaderLineHeight(value: ReaderLineHeight) {
  switch (value) {
    case "tight":
      return "Tight"
    case "airy":
      return "Airy"
    default:
      return "Relaxed"
  }
}

function formatReaderMarginMode(value: ReaderMarginMode) {
  switch (value) {
    case "narrow":
      return "Narrow"
    case "wide":
      return "Wide"
    default:
      return "Balanced"
  }
}

function formatPresentationSummary(presentation: ReaderDocumentExportPresentation) {
  return [
    formatReaderContentMode(presentation.contentMode),
    formatReaderThemeTone(presentation.themeTone),
    `${formatReaderFontFamily(presentation.fontFamily)} font`,
    `${formatReaderFontScale(presentation.fontScale).toLowerCase()} size`,
    `${formatReaderLineHeight(presentation.lineHeight).toLowerCase()} leading`,
    `${formatReaderMarginMode(presentation.marginMode).toLowerCase()} margins`,
  ].join(", ")
}

function getExtractedParagraphs(content: ArticleDetailDto["article"]["contentExtracted"]) {
  return (
    content
      ?.split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0) ?? []
  )
}

function isExtractedAnchor(anchor: unknown): anchor is ExtractedAnchor {
  if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) {
    return false
  }

  const candidate = anchor as Partial<ExtractedAnchor>

  return (
    candidate.contentMode === "extracted" &&
    Number.isInteger(candidate.paragraphIndex) &&
    Number.isInteger(candidate.startOffset) &&
    Number.isInteger(candidate.endOffset) &&
    (candidate.paragraphIndex ?? -1) >= 0 &&
    (candidate.startOffset ?? -1) >= 0 &&
    (candidate.endOffset ?? -1) > (candidate.startOffset ?? -1)
  )
}

function isHexColor(value: string | null | undefined): value is `#${string}` {
  return value ? /^#[\da-f]{6}$/i.test(value) : false
}

function buildAnnotationStyle(annotation: AnnotationDto) {
  if (!isHexColor(annotation.color)) {
    return ""
  }

  return ` style="--annotation-accent: ${escapeAttribute(annotation.color)}"`
}

function collectParagraphAnnotationRanges(
  annotations: AnnotationDto[],
  paragraphIndex: number,
  paragraphText: string,
) {
  const ranges: AnnotationRange[] = []
  let cursor = 0

  for (const annotation of annotations) {
    const anchor = isExtractedAnchor(annotation.anchor) ? annotation.anchor : null

    if (!anchor || anchor.paragraphIndex !== paragraphIndex) {
      continue
    }

    const startOffset = Math.max(0, Math.min(paragraphText.length, anchor.startOffset))
    const endOffset = Math.max(startOffset, Math.min(paragraphText.length, anchor.endOffset))

    if (endOffset <= startOffset || startOffset < cursor) {
      continue
    }

    ranges.push({
      annotation,
      startOffset,
      endOffset,
    })
    cursor = endOffset
  }

  return ranges.sort(
    (left, right) => left.startOffset - right.startOffset || left.endOffset - right.endOffset,
  )
}

function renderAnnotatedParagraph(
  paragraphText: string,
  paragraphIndex: number,
  annotations: AnnotationDto[],
) {
  const ranges = collectParagraphAnnotationRanges(annotations, paragraphIndex, paragraphText)

  if (ranges.length === 0) {
    return escapeHtml(paragraphText)
  }

  const fragments: string[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.startOffset > cursor) {
      fragments.push(escapeHtml(paragraphText.slice(cursor, range.startOffset)))
    }

    const annotationClass = `rss-annotation rss-annotation--${range.annotation.type}`
    fragments.push(
      `<mark class="${annotationClass}" data-annotation-id="${escapeAttribute(
        range.annotation.id,
      )}"${buildAnnotationStyle(range.annotation)}>${escapeHtml(
        paragraphText.slice(range.startOffset, range.endOffset),
      )}</mark>`,
    )
    cursor = range.endOffset
  }

  if (cursor < paragraphText.length) {
    fragments.push(escapeHtml(paragraphText.slice(cursor)))
  }

  return fragments.join("")
}

function buildSummaryHtml(detail: ArticleDetailDto) {
  const summary = normalizeMultilineText(detail.article.summary)

  if (summary.length === 0) {
    return `<section class="rss-section rss-summary"><h2>Summary</h2><p>No summary recorded.</p></section>`
  }

  return `<section class="rss-section rss-summary"><h2>Summary</h2><blockquote>${escapeHtml(
    summary,
  )}</blockquote></section>`
}

function buildArticleMetadataHtml(detail: ArticleDetailDto) {
  const primaryUrl = detail.article.canonicalUrl ?? detail.article.originalUrl
  const rows: Array<[string, string]> = [
    ["Source", normalizeInlineText(detail.feed.displayTitle)],
    ["Source site", formatNullable(detail.feed.siteUrl)],
    ["Author", formatNullable(detail.article.author)],
    ["Published", formatNullable(detail.article.publishedAt)],
    ["Fetched", detail.article.fetchedAt],
    ["Canonical URL", formatNullable(detail.article.canonicalUrl)],
    ["Original URL", formatNullable(detail.article.originalUrl)],
    ["Primary URL", formatNullable(primaryUrl)],
    ["Language", formatNullable(detail.article.language)],
    ["Word count", detail.article.wordCount?.toString() ?? "Unknown"],
    ["Tags", formatTags(detail)],
    ["Read state", detail.state.readState],
    ["Starred", formatBoolean(detail.state.starred)],
    ["Read later", formatBoolean(detail.state.readLater)],
    ["Reading progress", `${Math.round(detail.state.readingProgress * 100)}%`],
  ]

  return `<section class="rss-section rss-metadata"><h2>Metadata</h2><dl>${rows
    .map(
      ([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join("")}</dl></section>`
}

function buildArticleBodyHtml(detail: ArticleDetailDto, contentMode: ReaderContentMode): string {
  const extractedParagraphs = getExtractedParagraphs(detail.article.contentExtracted)
  const rawContent = normalizeMultilineText(detail.article.contentRaw)

  if (contentMode === "raw" && rawContent.length > 0) {
    return `<section class="rss-section rss-content rss-content--raw"><h2>Content</h2><pre><code>${escapeHtml(
      rawContent,
    )}</code></pre></section>`
  }

  if (extractedParagraphs.length > 0) {
    return `<section class="rss-section rss-content"><h2>Content</h2>${extractedParagraphs
      .map(
        (paragraph, paragraphIndex) =>
          `<p>${renderAnnotatedParagraph(paragraph, paragraphIndex, detail.annotations)}</p>`,
      )
      .join("")}</section>`
  }

  if (rawContent.length > 0) {
    return `<section class="rss-section rss-content rss-content--raw"><h2>Content</h2><pre><code>${escapeHtml(
      rawContent,
    )}</code></pre></section>`
  }

  return `<section class="rss-section rss-content"><h2>Content</h2><p>No article body is available.</p></section>`
}

function buildAnnotationAnchorLabel(anchor: AnnotationDto["anchor"]) {
  if (!isExtractedAnchor(anchor)) {
    return JSON.stringify(anchor)
  }

  return `extracted paragraph ${anchor.paragraphIndex + 1}, offsets ${anchor.startOffset}-${
    anchor.endOffset
  }`
}

function buildAnnotationListHtml(annotations: AnnotationDto[]) {
  if (annotations.length === 0) {
    return `<section class="rss-section rss-annotations"><h2>Annotations</h2><p>No annotations recorded.</p></section>`
  }

  return `<section class="rss-section rss-annotations"><h2>Annotations</h2><ol>${annotations
    .map((annotation) => {
      const note = normalizeMultilineText(annotation.note)
      const noteHtml =
        note.length > 0 ? `<p class="rss-annotation-note">${escapeHtml(note)}</p>` : ""

      return `<li><h3>${escapeHtml(formatAnnotationType(annotation.type))}</h3><p class="rss-annotation-facts">Created ${escapeHtml(
        annotation.createdAt,
      )}; color ${escapeHtml(formatNullable(annotation.color))}; anchor ${escapeHtml(
        buildAnnotationAnchorLabel(annotation.anchor),
      )}</p><blockquote>${escapeHtml(annotation.selectedText)}</blockquote>${noteHtml}</li>`
    })
    .join("")}</ol></section>`
}

function buildAttachmentsHtml(attachments: AttachmentDto[]) {
  if (attachments.length === 0) {
    return `<section class="rss-section rss-attachments"><h2>Attachments</h2><p>No attachments recorded.</p></section>`
  }

  return `<section class="rss-section rss-attachments"><h2>Attachments</h2><ul>${attachments
    .map(
      (attachment) =>
        `<li><strong>${escapeHtml(attachment.type)}</strong>: <a href="${escapeAttribute(
          attachment.url,
        )}">${escapeHtml(attachment.url)}</a><span>${escapeHtml(
          formatAttachmentLabel(attachment),
        )}</span></li>`,
    )
    .join("")}</ul></section>`
}

function buildArticleHtmlDocument(
  detail: ArticleDetailDto,
  presentation: ReaderDocumentExportPresentation,
) {
  return `<article class="rss-article"><header class="rss-article__header"><p class="rss-eyebrow">${escapeHtml(
    normalizeInlineText(detail.feed.displayTitle),
  )}</p><h1>${escapeHtml(buildDocumentTitle(detail.article.title))}</h1></header>${[
    buildArticleMetadataHtml(detail),
    buildSummaryHtml(detail),
    buildArticleBodyHtml(detail, presentation.contentMode),
    buildAnnotationListHtml(detail.annotations),
    buildAttachmentsHtml(detail.attachments),
  ].join("")}</article>`
}

function buildBatchSummaryHtml(input: {
  annotationCount: number
  attachmentCount: number
  details: ArticleDetailDto[]
  generatedAt: string
  presentationSummary: string
  title: string
}) {
  return `<section class="rss-export-summary"><h1>${escapeHtml(
    buildDocumentTitle(input.title),
  )}</h1><dl><div><dt>Generated</dt><dd>${escapeHtml(
    input.generatedAt,
  )}</dd></div><div><dt>Article count</dt><dd>${input.details.length}</dd></div><div><dt>Annotation count</dt><dd>${input.annotationCount}</dd></div><div><dt>Attachment count</dt><dd>${input.attachmentCount}</dd></div><div><dt>Presentation</dt><dd>${escapeHtml(
    input.presentationSummary,
  )}</dd></div></dl></section>`
}

function buildHtmlDocument(input: {
  annotationCount: number
  articleDocuments: string[]
  attachmentCount: number
  details: ArticleDetailDto[]
  format: ReaderDocumentExportFormat
  generatedAt: string
  presentation: ReaderDocumentExportPresentation
  presentationSummary: string
  title: string
}) {
  const summaryHtml =
    input.details.length > 1
      ? `${buildBatchSummaryHtml({
          annotationCount: input.annotationCount,
          attachmentCount: input.attachmentCount,
          details: input.details,
          generatedAt: input.generatedAt,
          presentationSummary: input.presentationSummary,
          title: input.title,
        })}`
      : ""

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(buildDocumentTitle(input.title))}</title>
  <meta name="generator" content="FreelyRSS desktop export">
  <meta name="freelyrss-export-format" content="${input.format}">
  ${buildDocumentCss(input.presentation, input.format)}
</head>
<body data-export-format="${input.format}">
  <main class="rss-export">
    ${summaryHtml}
    ${input.articleDocuments.join("\n    ")}
  </main>
</body>
</html>
`
}

export function buildReaderDocumentExport(
  input: BuildReaderDocumentExportInput,
): ReaderDocumentExportResult {
  if (input.details.length === 0) {
    throw new Error("HTML/PDF export requires at least one article.")
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const title =
    input.title ??
    (input.mode === "single" ? input.details[0]?.article.title : "FreelyRSS document export") ??
    "FreelyRSS document export"
  const presentationSummary = formatPresentationSummary(input.presentation)
  const annotationCount = input.details.reduce(
    (count, detail) => count + detail.annotations.length,
    0,
  )
  const attachmentCount = input.details.reduce(
    (count, detail) => count + detail.attachments.length,
    0,
  )
  const articleDocuments = input.details.map((detail) =>
    buildArticleHtmlDocument(detail, input.presentation),
  )
  const documentText = buildHtmlDocument({
    annotationCount,
    articleDocuments,
    attachmentCount,
    details: input.details,
    format: input.format,
    generatedAt,
    presentation: input.presentation,
    presentationSummary,
    title,
  })

  return {
    articleIds: input.details.map((detail) => detail.article.id),
    documentText,
    fileName: buildFileName({
      details: input.details,
      format: input.format,
      generatedAt,
      mode: input.mode,
      title,
    }),
    report: {
      annotationCount,
      attachmentCount,
      contentMode: input.presentation.contentMode,
      exportedArticleCount: input.details.length,
      format: input.format,
      generatedAt,
      mode: input.mode,
      presentationSummary,
      themeTone: input.presentation.themeTone,
      title,
    },
  }
}
