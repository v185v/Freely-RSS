import type { AnnotationDto, ArticleDetailDto, AttachmentDto } from "@freelyrss/shared-types"

import type { ReaderMarkdownExportMode, ReaderMarkdownExportResult } from "./types"

type BuildReaderMarkdownExportInput = {
  details: ArticleDetailDto[]
  generatedAt?: string
  mode: ReaderMarkdownExportMode
  title?: string
}

function normalizeMultilineText(value: string | null | undefined) {
  return value?.replace(/\r\n?/g, "\n").trim() ?? ""
}

function normalizeInlineText(value: string | null | undefined, fallback = "Unknown") {
  const normalized = normalizeMultilineText(value).replace(/\s+/g, " ")
  return normalized.length > 0 ? normalized : fallback
}

function buildMarkdownHeading(value: string) {
  const heading = normalizeInlineText(value, "Untitled article").replace(/^#+\s*/, "")
  return heading.length > 0 ? heading : "Untitled article"
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
  generatedAt: string
  mode: ReaderMarkdownExportMode
  title: string
}) {
  if (input.mode === "single") {
    const detail = input.details[0]
    return `${buildSlugSegment(detail?.article.title ?? input.title)}.md`
  }

  return `${buildSlugSegment(input.title)}-${buildExportTimestampSlug(input.generatedAt)}.md`
}

function quoteBlock(value: string) {
  const normalized = normalizeMultilineText(value)

  if (normalized.length === 0) {
    return "> No text captured."
  }

  return normalized
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")
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

function formatAnnotationAnchor(anchor: AnnotationDto["anchor"]) {
  if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) {
    return JSON.stringify(anchor)
  }

  const candidate = anchor as {
    contentMode?: unknown
    endOffset?: unknown
    paragraphIndex?: unknown
    startOffset?: unknown
  }

  if (
    candidate.contentMode === "extracted" &&
    Number.isInteger(candidate.paragraphIndex) &&
    Number.isInteger(candidate.startOffset) &&
    Number.isInteger(candidate.endOffset)
  ) {
    return `extracted paragraph ${Number(candidate.paragraphIndex) + 1}, offsets ${
      candidate.startOffset
    }-${candidate.endOffset}`
  }

  return JSON.stringify(anchor)
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

function buildAttachmentMarkdown(attachments: AttachmentDto[]) {
  if (attachments.length === 0) {
    return "## Attachments\n\nNo attachments recorded."
  }

  return [
    "## Attachments",
    "",
    ...attachments.map(
      (attachment) =>
        `- ${attachment.type}: ${attachment.url} (${formatAttachmentLabel(attachment)})`,
    ),
  ].join("\n")
}

function buildAnnotationMarkdown(annotations: AnnotationDto[]) {
  if (annotations.length === 0) {
    return "## Annotations\n\nNo annotations recorded."
  }

  return [
    "## Annotations",
    "",
    ...annotations.flatMap((annotation, index) => {
      const note = normalizeMultilineText(annotation.note)
      const lines = [
        `### ${index + 1}. ${formatAnnotationType(annotation.type)}`,
        "",
        `- Created: ${annotation.createdAt}`,
        `- Color: ${formatNullable(annotation.color)}`,
        `- Anchor: ${formatAnnotationAnchor(annotation.anchor)}`,
        "",
        quoteBlock(annotation.selectedText),
      ]

      if (note.length > 0) {
        lines.push("", `Note: ${note}`)
      }

      return lines
    }),
  ].join("\n")
}

function buildArticleBody(detail: ArticleDetailDto) {
  const extractedContent = normalizeMultilineText(detail.article.contentExtracted)

  if (extractedContent.length > 0) {
    return ["## Content", "", extractedContent].join("\n")
  }

  const rawContent = normalizeMultilineText(detail.article.contentRaw)

  if (rawContent.length > 0) {
    return ["## Content", "", "```html", rawContent.replaceAll("```", "``\\`"), "```"].join("\n")
  }

  return "## Content\n\nNo article body is available."
}

function buildArticleMetadata(detail: ArticleDetailDto) {
  const primaryUrl = detail.article.canonicalUrl ?? detail.article.originalUrl

  return [
    "## Metadata",
    "",
    `- Source: ${normalizeInlineText(detail.feed.displayTitle)}`,
    `- Source site: ${formatNullable(detail.feed.siteUrl)}`,
    `- Author: ${formatNullable(detail.article.author)}`,
    `- Published: ${formatNullable(detail.article.publishedAt)}`,
    `- Fetched: ${detail.article.fetchedAt}`,
    `- Canonical URL: ${formatNullable(detail.article.canonicalUrl)}`,
    `- Original URL: ${formatNullable(detail.article.originalUrl)}`,
    `- Primary URL: ${formatNullable(primaryUrl)}`,
    `- Language: ${formatNullable(detail.article.language)}`,
    `- Word count: ${detail.article.wordCount ?? "Unknown"}`,
    `- Tags: ${formatTags(detail)}`,
    `- Read state: ${detail.state.readState}`,
    `- Starred: ${formatBoolean(detail.state.starred)}`,
    `- Read later: ${formatBoolean(detail.state.readLater)}`,
    `- Reading progress: ${Math.round(detail.state.readingProgress * 100)}%`,
  ].join("\n")
}

function buildSummaryMarkdown(detail: ArticleDetailDto) {
  const summary = normalizeMultilineText(detail.article.summary)

  if (summary.length === 0) {
    return "## Summary\n\nNo summary recorded."
  }

  return ["## Summary", "", quoteBlock(summary)].join("\n")
}

function buildArticleMarkdownDocument(detail: ArticleDetailDto) {
  return [
    `# ${buildMarkdownHeading(detail.article.title)}`,
    "",
    buildArticleMetadata(detail),
    "",
    buildSummaryMarkdown(detail),
    "",
    buildArticleBody(detail),
    "",
    buildAnnotationMarkdown(detail.annotations),
    "",
    buildAttachmentMarkdown(detail.attachments),
  ].join("\n")
}

function buildBatchMarkdown(input: {
  annotationCount: number
  articleDocuments: string[]
  details: ArticleDetailDto[]
  generatedAt: string
  title: string
}) {
  return [
    `# ${buildMarkdownHeading(input.title)}`,
    "",
    "## Export summary",
    "",
    `- Generated: ${input.generatedAt}`,
    `- Article count: ${input.details.length}`,
    `- Annotation count: ${input.annotationCount}`,
    "",
    "---",
    "",
    input.articleDocuments.join("\n\n---\n\n"),
  ].join("\n")
}

export function buildReaderMarkdownExport(
  input: BuildReaderMarkdownExportInput,
): ReaderMarkdownExportResult {
  if (input.details.length === 0) {
    throw new Error("Markdown export requires at least one article.")
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const title =
    input.title ??
    (input.mode === "single" ? input.details[0]?.article.title : "FreelyRSS Markdown export") ??
    "FreelyRSS Markdown export"
  const annotationCount = input.details.reduce(
    (count, detail) => count + detail.annotations.length,
    0,
  )
  const articleDocuments = input.details.map((detail) => buildArticleMarkdownDocument(detail))
  const markdownText =
    input.mode === "single"
      ? (articleDocuments[0] ?? "")
      : buildBatchMarkdown({
          annotationCount,
          articleDocuments,
          details: input.details,
          generatedAt,
          title,
        })

  return {
    articleIds: input.details.map((detail) => detail.article.id),
    fileName: buildFileName({
      details: input.details,
      generatedAt,
      mode: input.mode,
      title,
    }),
    markdownText: `${markdownText}\n`,
    report: {
      annotationCount,
      exportedArticleCount: input.details.length,
      generatedAt,
      mode: input.mode,
      title,
    },
  }
}
