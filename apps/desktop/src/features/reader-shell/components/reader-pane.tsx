import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from "react"

import type { ArticleDetailDto } from "@freelyrss/shared-types"
import { Button, SplitPane, Surface } from "@freelyrss/ui"

import { findTextHighlightRanges } from "../search-highlighting"
import { formatReaderProgress } from "../selectors"
import type {
  CreateReaderAnnotationInput,
  ReaderAnnotationAnchor,
  ReaderAnnotationKind,
  ReaderContentMode,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderMarginMode,
  ReaderThemeTone,
} from "../types"

type ReaderStateMutationInput = {
  articleId: ArticleDetailDto["article"]["id"]
  importance?: ArticleDetailDto["state"]["importance"]
  liked?: ArticleDetailDto["state"]["liked"]
  readLater?: ArticleDetailDto["state"]["readLater"]
  readingProgress?: ArticleDetailDto["state"]["readingProgress"]
  readState?: ArticleDetailDto["state"]["readState"]
  starred?: ArticleDetailDto["state"]["starred"]
}

type ReaderPendingSelection = {
  anchor: ReaderAnnotationAnchor
  paragraphText: string
  selectedText: string
}

type ReaderPaneProps = {
  activeDetail: ArticleDetailDto | null
  annotationErrorMessage: string | null
  articleStateErrorMessage: string | null
  describedBy?: string
  headingId: string
  isCreatingAnnotation: boolean
  isUpdatingArticleState: boolean
  onCreateAnnotation: (input: CreateReaderAnnotationInput) => void
  onSetReaderContentMode: (readerContentMode: ReaderContentMode) => void
  onSetReaderFontFamily: (readerFontFamily: ReaderFontFamily) => void
  onSetReaderFontScale: (readerFontScale: ReaderFontScale) => void
  onSetReaderLineHeight: (readerLineHeight: ReaderLineHeight) => void
  onSetReaderMarginMode: (readerMarginMode: ReaderMarginMode) => void
  onSetThemeTone: (themeTone: ReaderThemeTone) => void
  onUpdateArticleState: (input: ReaderStateMutationInput) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  readerContentMode: ReaderContentMode
  readerFontFamily: ReaderFontFamily
  readerFontScale: ReaderFontScale
  readerLineHeight: ReaderLineHeight
  readerMarginMode: ReaderMarginMode
  searchHighlightTerms: string[]
  themeTone: ReaderThemeTone
}

const READ_STATE_OPTIONS: Array<{
  label: string
  value: ArticleDetailDto["state"]["readState"]
}> = [
  { label: "Unread", value: "unread" },
  { label: "Reading", value: "reading" },
  { label: "Read", value: "read" },
]

const IMPORTANCE_OPTIONS: Array<{
  label: string
  value: ArticleDetailDto["state"]["importance"]
}> = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
]

const READING_PROGRESS_OPTIONS = [0, 0.25, 0.5, 0.75, 1] as const

const THEME_TONE_OPTIONS: Array<{
  label: string
  value: ReaderThemeTone
}> = [
  { label: "Daylight", value: "daylight" },
  { label: "Midnight", value: "midnight" },
  { label: "High contrast", value: "high-contrast" },
]

const FONT_FAMILY_OPTIONS: Array<{
  label: string
  note: string
  value: ReaderFontFamily
}> = [
  { label: "Editorial", note: "Serif reading voice", value: "editorial" },
  { label: "Sans", note: "Clean interface text", value: "sans" },
  { label: "Technical", note: "Dense operator view", value: "technical" },
]

const FONT_SCALE_OPTIONS: Array<{
  label: string
  value: ReaderFontScale
}> = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Large", value: "large" },
]

const LINE_HEIGHT_OPTIONS: Array<{
  label: string
  value: ReaderLineHeight
}> = [
  { label: "Tight", value: "tight" },
  { label: "Relaxed", value: "relaxed" },
  { label: "Airy", value: "airy" },
]

const MARGIN_OPTIONS: Array<{
  label: string
  value: ReaderMarginMode
}> = [
  { label: "Narrow", value: "narrow" },
  { label: "Balanced", value: "balanced" },
  { label: "Wide", value: "wide" },
]

const DEFAULT_ANNOTATION_COLORS: Record<ReaderAnnotationKind, string> = {
  highlight: "#f4b860",
  note: "#8eb6ff",
}

function formatReaderDate(value: string | null, fallback = "No publish time yet") {
  if (!value) {
    return fallback
  }

  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    return value
  }

  return `${new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(timestamp)} UTC`
}

function formatBooleanState(value: boolean) {
  return value ? "Yes" : "No"
}

function formatAttachmentLabel(type: ArticleDetailDto["attachments"][number]["type"]) {
  switch (type) {
    case "audio":
      return "Podcast enclosure"
    case "image":
      return "Image attachment"
    case "video":
      return "Video attachment"
    default:
      return "Linked file"
  }
}

function formatAttachmentDuration(value: number | null) {
  if (value === null) {
    return "Unknown"
  }

  const minutes = Math.floor(value / 60)
  const seconds = value % 60

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function formatAttachmentSize(value: number | null) {
  if (value === null) {
    return "Unknown"
  }

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function formatAttachmentName(url: string) {
  const segments = url.split("/")
  return segments.at(-1) ?? url
}

function formatThemeToneLabel(value: ReaderThemeTone) {
  switch (value) {
    case "daylight":
      return "Daylight"
    case "high-contrast":
      return "High contrast"
    default:
      return "Midnight"
  }
}

function formatFontFamilyLabel(value: ReaderFontFamily) {
  switch (value) {
    case "editorial":
      return "Editorial"
    case "technical":
      return "Technical"
    default:
      return "Sans"
  }
}

function formatFontScaleLabel(value: ReaderFontScale) {
  switch (value) {
    case "compact":
      return "Compact"
    case "large":
      return "Large"
    default:
      return "Comfortable"
  }
}

function formatLineHeightLabel(value: ReaderLineHeight) {
  switch (value) {
    case "tight":
      return "Tight"
    case "airy":
      return "Airy"
    default:
      return "Relaxed"
  }
}

function formatMarginModeLabel(value: ReaderMarginMode) {
  switch (value) {
    case "narrow":
      return "Narrow"
    case "wide":
      return "Wide"
    default:
      return "Balanced"
  }
}

function formatAnnotationTypeLabel(type: ArticleDetailDto["annotations"][number]["type"]) {
  switch (type) {
    case "highlight":
      return "Highlight"
    case "note":
      return "Note"
    default:
      return "Comment"
  }
}

function getExtractedParagraphs(content: ArticleDetailDto["article"]["contentExtracted"]) {
  return (
    content
      ?.split("\n\n")
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0) ?? []
  )
}

function isHexColor(value: string | null | undefined): value is `#${string}` {
  return value ? /^#[\da-f]{6}$/i.test(value) : false
}

function withAlpha(color: string | null | undefined, alpha: string) {
  return isHexColor(color) ? `${color}${alpha}` : null
}

function buildAnnotationStyle(annotation: ArticleDetailDto["annotations"][number]) {
  const accent =
    annotation.type === "highlight"
      ? (annotation.color ?? DEFAULT_ANNOTATION_COLORS.highlight)
      : (annotation.color ?? DEFAULT_ANNOTATION_COLORS.note)

  return {
    "--reader-annotation-accent": accent,
    "--reader-annotation-accent-soft": withAlpha(accent, "2b") ?? `${accent}2b`,
  } as CSSProperties
}

function isReaderAnnotationAnchor(anchor: unknown): anchor is ReaderAnnotationAnchor {
  if (!anchor || typeof anchor !== "object") {
    return false
  }

  const candidate = anchor as Partial<ReaderAnnotationAnchor>

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

function findClosestParagraphElement(node: Node | null) {
  if (!node) {
    return null
  }

  const element = node instanceof Element ? node : node.parentElement
  return element?.closest<HTMLElement>("[data-reader-paragraph-index]") ?? null
}

function measureTextOffset(root: HTMLElement, node: Node, offset: number) {
  try {
    const range = root.ownerDocument.createRange()
    range.selectNodeContents(root)
    range.setEnd(node, offset)
    return range.toString().length
  } catch {
    return null
  }
}

function clearWindowSelection() {
  try {
    window.getSelection()?.removeAllRanges()
  } catch {}
}

function collectParagraphAnnotations(
  annotations: ArticleDetailDto["annotations"],
  paragraphIndex: number,
) {
  return annotations
    .map((annotation) => ({
      annotation,
      anchor: isReaderAnnotationAnchor(annotation.anchor) ? annotation.anchor : null,
    }))
    .filter(
      (
        entry,
      ): entry is {
        annotation: ArticleDetailDto["annotations"][number]
        anchor: ReaderAnnotationAnchor
      } => entry.anchor !== null && entry.anchor.paragraphIndex === paragraphIndex,
    )
    .sort(
      (left, right) =>
        left.anchor.startOffset - right.anchor.startOffset ||
        left.anchor.endOffset - right.anchor.endOffset,
    )
}

function normalizeParagraphAnnotationRanges(
  paragraphText: string,
  annotations: ArticleDetailDto["annotations"],
  paragraphIndex: number,
) {
  const ranges: Array<{
    anchor: ReaderAnnotationAnchor
    annotation: ArticleDetailDto["annotations"][number]
  }> = []
  let cursor = 0

  for (const entry of collectParagraphAnnotations(annotations, paragraphIndex)) {
    const startOffset = Math.max(0, Math.min(paragraphText.length, entry.anchor.startOffset))
    const endOffset = Math.max(startOffset, Math.min(paragraphText.length, entry.anchor.endOffset))

    if (endOffset <= startOffset || startOffset < cursor) {
      continue
    }

    ranges.push({
      annotation: entry.annotation,
      anchor: {
        ...entry.anchor,
        startOffset,
        endOffset,
      },
    })
    cursor = endOffset
  }

  return ranges
}

function renderSearchHighlightedText(text: string, searchHighlightTerms: string[]) {
  const searchRanges = findTextHighlightRanges(text, searchHighlightTerms)

  if (searchRanges.length === 0) {
    return text
  }

  const fragments: ReactNode[] = []
  let cursor = 0

  for (const range of searchRanges) {
    if (range.end <= range.start || range.start < cursor) {
      continue
    }

    if (range.start > cursor) {
      fragments.push(text.slice(cursor, range.start))
    }

    fragments.push(
      <span className="desktop-reader__search-hit" data-search-hit="true" key={range.start}>
        {text.slice(range.start, range.end)}
      </span>,
    )
    cursor = range.end
  }

  if (cursor < text.length) {
    fragments.push(text.slice(cursor))
  }

  return fragments
}

function renderAnnotatedParagraph(
  paragraphText: string,
  paragraphIndex: number,
  annotations: ArticleDetailDto["annotations"],
  searchHighlightTerms: string[],
) {
  const paragraphAnnotations = normalizeParagraphAnnotationRanges(
    paragraphText,
    annotations,
    paragraphIndex,
  )
  const searchRanges = findTextHighlightRanges(paragraphText, searchHighlightTerms)

  if (paragraphAnnotations.length === 0 && searchRanges.length === 0) {
    return paragraphText
  }

  const boundaries = new Set<number>([0, paragraphText.length])

  for (const { anchor } of paragraphAnnotations) {
    boundaries.add(anchor.startOffset)
    boundaries.add(anchor.endOffset)
  }

  for (const range of searchRanges) {
    boundaries.add(range.start)
    boundaries.add(range.end)
  }

  const orderedBoundaries = Array.from(boundaries).sort((left, right) => left - right)
  const fragments: ReactNode[] = []

  for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
    const startOffset = orderedBoundaries[index] ?? 0
    const endOffset = orderedBoundaries[index + 1] ?? 0

    if (endOffset <= startOffset) {
      continue
    }

    const segmentText = paragraphText.slice(startOffset, endOffset)

    if (segmentText.length === 0) {
      continue
    }

    const activeAnnotation =
      paragraphAnnotations.find(
        ({ anchor }) => startOffset >= anchor.startOffset && endOffset <= anchor.endOffset,
      ) ?? null
    const hasSearchHit = searchRanges.some(
      (range) => startOffset >= range.start && endOffset <= range.end,
    )

    if (!activeAnnotation && !hasSearchHit) {
      fragments.push(segmentText)
      continue
    }

    let content: ReactNode = segmentText

    if (hasSearchHit) {
      content = (
        <span
          className="desktop-reader__search-hit"
          data-search-hit="true"
          key={`search-${paragraphIndex}-${startOffset}-${endOffset}`}
        >
          {content}
        </span>
      )
    }

    if (activeAnnotation) {
      fragments.push(
        <mark
          className={`desktop-reader__annotation desktop-reader__annotation--${activeAnnotation.annotation.type}`}
          data-annotation-id={activeAnnotation.annotation.id}
          data-annotation-type={activeAnnotation.annotation.type}
          key={`${activeAnnotation.annotation.id}-${startOffset}-${endOffset}`}
          style={buildAnnotationStyle(activeAnnotation.annotation)}
        >
          {content}
        </mark>,
      )
      continue
    }

    fragments.push(content)
  }

  return fragments
}

export function ReaderPane({
  activeDetail,
  annotationErrorMessage,
  articleStateErrorMessage,
  describedBy,
  headingId,
  isCreatingAnnotation,
  isUpdatingArticleState,
  onCreateAnnotation,
  onSetReaderContentMode,
  onSetReaderFontFamily,
  onSetReaderFontScale,
  onSetReaderLineHeight,
  onSetReaderMarginMode,
  onSetThemeTone,
  onUpdateArticleState,
  paneId,
  paneRef,
  readerContentMode,
  readerFontFamily,
  readerFontScale,
  readerLineHeight,
  readerMarginMode,
  searchHighlightTerms,
  themeTone,
}: ReaderPaneProps) {
  const [annotationNoteDraft, setAnnotationNoteDraft] = useState("")
  const [pendingSelection, setPendingSelection] = useState<ReaderPendingSelection | null>(null)
  const [selectionErrorMessage, setSelectionErrorMessage] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const annotationNoteId = useId()
  const extractedContent = activeDetail?.article.contentExtracted?.trim() ?? null
  const rawContent = activeDetail?.article.contentRaw?.trim() ?? null
  const extractedParagraphs = getExtractedParagraphs(extractedContent)
  const activeReaderContent = readerContentMode === "raw" ? rawContent : extractedContent
  const alternateReaderContent = readerContentMode === "raw" ? extractedContent : rawContent
  const primaryUrl = activeDetail?.article.canonicalUrl ?? activeDetail?.article.originalUrl ?? null
  const annotationResetKey = `${activeDetail?.article.id ?? "none"}:${readerContentMode}`
  const readerPresentationSummary = `${formatThemeToneLabel(themeTone)} theme, ${formatFontFamilyLabel(readerFontFamily)} font, ${formatFontScaleLabel(readerFontScale)} size, ${formatLineHeightLabel(readerLineHeight).toLowerCase()} leading, ${formatMarginModeLabel(readerMarginMode).toLowerCase()} margins`
  const readerPresentationStyle = {
    "--reader-sample-max-width":
      readerMarginMode === "narrow" ? "78ch" : readerMarginMode === "wide" ? "58ch" : "68ch",
  } as CSSProperties

  useEffect(() => {
    void annotationResetKey
    setAnnotationNoteDraft("")
    setPendingSelection(null)
    setSelectionErrorMessage(null)
    clearWindowSelection()
  }, [annotationResetKey])

  const handleSelectionChange = useEffectEvent(() => {
    if (
      !activeDetail ||
      readerContentMode !== "extracted" ||
      !contentRef.current ||
      extractedParagraphs.length === 0
    ) {
      setPendingSelection(null)
      return
    }

    const selection = window.getSelection()

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return
    }

    const range = selection.getRangeAt(0)

    if (!contentRef.current.contains(range.commonAncestorContainer)) {
      return
    }

    const startParagraph = findClosestParagraphElement(range.startContainer)
    const endParagraph = findClosestParagraphElement(range.endContainer)

    if (!startParagraph || startParagraph !== endParagraph) {
      setPendingSelection(null)
      setSelectionErrorMessage(
        "Annotations currently require a text selection inside one extracted paragraph.",
      )
      return
    }

    const paragraphIndex = Number(startParagraph.dataset.readerParagraphIndex)
    const paragraphText = extractedParagraphs[paragraphIndex]

    if (!Number.isInteger(paragraphIndex) || !paragraphText) {
      setPendingSelection(null)
      return
    }

    const startOffset = measureTextOffset(startParagraph, range.startContainer, range.startOffset)
    const endOffset = measureTextOffset(startParagraph, range.endContainer, range.endOffset)

    if (startOffset === null || endOffset === null || endOffset <= startOffset) {
      setPendingSelection(null)
      return
    }

    const selectedText = paragraphText.slice(startOffset, endOffset).trim()

    if (selectedText.length === 0) {
      setPendingSelection(null)
      return
    }

    setSelectionErrorMessage(null)
    setPendingSelection({
      anchor: {
        contentMode: "extracted",
        paragraphIndex,
        startOffset,
        endOffset,
      },
      paragraphText,
      selectedText,
    })
  })

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [handleSelectionChange])

  function clearPendingSelection() {
    setPendingSelection(null)
    setSelectionErrorMessage(null)
    clearWindowSelection()
  }

  function handleCreateAnnotation(type: ReaderAnnotationKind) {
    if (!activeDetail || !pendingSelection) {
      setSelectionErrorMessage("Select extracted article text before creating an annotation.")
      return
    }

    const normalizedNote = annotationNoteDraft.trim()

    if (type === "note" && normalizedNote.length === 0) {
      setSelectionErrorMessage("Enter a note before saving a note annotation.")
      return
    }

    setSelectionErrorMessage(null)
    onCreateAnnotation({
      articleId: activeDetail.article.id,
      type,
      selectedText: pendingSelection.selectedText,
      anchor: pendingSelection.anchor,
      note: type === "note" ? normalizedNote : null,
      color: DEFAULT_ANNOTATION_COLORS[type],
    })
    setAnnotationNoteDraft("")
    clearPendingSelection()
  }

  return (
    <SplitPane
      aria-describedby={describedBy}
      aria-keyshortcuts="Alt+4"
      aria-labelledby={headingId}
      className="desktop-pane"
      id={paneId}
      ref={paneRef}
      tabIndex={-1}
    >
      <Surface className="desktop-pane__surface desktop-pane__surface--reader">
        <div className="desktop-pane__header">
          <p className="desktop-pane__eyebrow">Right pane</p>
          <h2 id={headingId}>Reading panel</h2>
          {activeDetail ? (
            <p className="desktop-pane__focus-title">{activeDetail.article.title}</p>
          ) : (
            <p className="desktop-pane__focus-title">No article selected yet</p>
          )}
          <p className="desktop-pane__description">
            The selected article still comes from route state, and the reader still preserves the
            Step 40 content-mode toggle plus the Step 42 attachment surface. Step 46 now adds
            shell-side text selection, anchored highlights, and note creation without changing
            article selection, shared DTO ownership, or durable SQLite persistence boundaries.
          </p>
        </div>

        {activeDetail ? (
          <>
            <div className="desktop-reader__facts">
              <div>
                <span className="desktop-reader__fact-label">Feed</span>
                <strong>{activeDetail.feed.displayTitle}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Author</span>
                <strong>{activeDetail.article.author ?? "Unknown author"}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Published</span>
                <strong>{formatReaderDate(activeDetail.article.publishedAt)}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">State</span>
                <strong>{activeDetail.state.readState}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Progress</span>
                <strong>{formatReaderProgress(activeDetail.state.readingProgress)}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Starred state</span>
                <strong>{formatBooleanState(activeDetail.state.starred)}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Liked state</span>
                <strong>{formatBooleanState(activeDetail.state.liked)}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Read later state</span>
                <strong>{formatBooleanState(activeDetail.state.readLater)}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Importance level</span>
                <strong>{activeDetail.state.importance}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Last opened</span>
                <strong>{formatReaderDate(activeDetail.state.lastOpenedAt, "Never opened")}</strong>
              </div>
              <div>
                <span className="desktop-reader__fact-label">Language</span>
                <strong>{activeDetail.article.language ?? "Unknown"}</strong>
              </div>
            </div>

            <div className="desktop-pane__scroll desktop-pane__scroll--reader">
              <article
                className="desktop-reader__article"
                data-reader-font-family={readerFontFamily}
                data-reader-font-scale={readerFontScale}
                data-reader-line-height={readerLineHeight}
                data-reader-margin-mode={readerMarginMode}
                data-reader-theme-tone={themeTone}
                style={readerPresentationStyle}
              >
                <header className="desktop-reader__article-header">
                  <p className="desktop-reader__section-label">Selected article</p>
                  <h3 className="desktop-reader__article-title">{activeDetail.article.title}</h3>
                  <p className="desktop-reader__summary">
                    {activeDetail.article.summary ??
                      "This article does not expose a summary yet, so the reading panel falls back to the extracted body."}
                  </p>
                </header>

                <section className="desktop-reader__state-controls">
                  <div className="desktop-reader__state-controls-header">
                    <div>
                      <p className="desktop-reader__section-label">Article state</p>
                      <p className="desktop-reader__state-note">
                        Step 43 keeps article state writes inside the desktop shell command path.
                        Step 44 reuses that same mutation boundary for keyboard commands, so the
                        queue, quick views, feed counts, and current reader detail stay synchronized
                        without introducing storage-backed persistence yet.
                      </p>
                    </div>
                    <div className="desktop-reader__state-summary">
                      <span className="desktop-reader__fact-label">Pending write</span>
                      <strong>{isUpdatingArticleState ? "Updating..." : "Idle"}</strong>
                    </div>
                  </div>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Read state</legend>
                    <div className="desktop-toolbar-pills">
                      {READ_STATE_OPTIONS.map((option) => {
                        const active = activeDetail.state.readState === option.value

                        return (
                          <Button
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            disabled={isUpdatingArticleState}
                            key={option.value}
                            onClick={() =>
                              onUpdateArticleState({
                                articleId: activeDetail.article.id,
                                readState: option.value,
                              })
                            }
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">State toggles</legend>
                    <div className="desktop-toolbar-pills">
                      <Button
                        aria-pressed={activeDetail.state.starred}
                        className={
                          activeDetail.state.starred
                            ? "desktop-pill desktop-pill--active"
                            : "desktop-pill"
                        }
                        disabled={isUpdatingArticleState}
                        onClick={() =>
                          onUpdateArticleState({
                            articleId: activeDetail.article.id,
                            starred: !activeDetail.state.starred,
                          })
                        }
                        size="sm"
                        tone={activeDetail.state.starred ? "neutral" : "ghost"}
                      >
                        Starred
                      </Button>
                      <Button
                        aria-pressed={activeDetail.state.liked}
                        className={
                          activeDetail.state.liked
                            ? "desktop-pill desktop-pill--active"
                            : "desktop-pill"
                        }
                        disabled={isUpdatingArticleState}
                        onClick={() =>
                          onUpdateArticleState({
                            articleId: activeDetail.article.id,
                            liked: !activeDetail.state.liked,
                          })
                        }
                        size="sm"
                        tone={activeDetail.state.liked ? "neutral" : "ghost"}
                      >
                        Liked
                      </Button>
                      <Button
                        aria-pressed={activeDetail.state.readLater}
                        className={
                          activeDetail.state.readLater
                            ? "desktop-pill desktop-pill--active"
                            : "desktop-pill"
                        }
                        disabled={isUpdatingArticleState}
                        onClick={() =>
                          onUpdateArticleState({
                            articleId: activeDetail.article.id,
                            readLater: !activeDetail.state.readLater,
                          })
                        }
                        size="sm"
                        tone={activeDetail.state.readLater ? "neutral" : "ghost"}
                      >
                        Read later
                      </Button>
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Importance</legend>
                    <div className="desktop-toolbar-pills">
                      {IMPORTANCE_OPTIONS.map((option) => {
                        const active = activeDetail.state.importance === option.value

                        return (
                          <Button
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            disabled={isUpdatingArticleState}
                            key={option.value}
                            onClick={() =>
                              onUpdateArticleState({
                                articleId: activeDetail.article.id,
                                importance: option.value,
                              })
                            }
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Reading progress</legend>
                    <div className="desktop-toolbar-pills desktop-reader__progress-grid">
                      {READING_PROGRESS_OPTIONS.map((progress) => {
                        const label = `${Math.round(progress * 100)}%`
                        const active = activeDetail.state.readingProgress === progress

                        return (
                          <Button
                            aria-label={`Set reading progress to ${label}`}
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            disabled={isUpdatingArticleState}
                            key={progress}
                            onClick={() =>
                              onUpdateArticleState({
                                articleId: activeDetail.article.id,
                                readingProgress: progress,
                              })
                            }
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {label}
                          </Button>
                        )
                      })}
                    </div>
                    <p className="desktop-reader__mode-note">
                      Progress writes also keep read-state transitions coherent: `0%` maps to
                      unread, values between `0%` and `100%` map to reading, and `100%` maps to
                      read.
                    </p>
                  </fieldset>

                  {articleStateErrorMessage ? (
                    <p className="desktop-reader__error" role="alert">
                      {articleStateErrorMessage}
                    </p>
                  ) : null}
                </section>

                <section className="desktop-reader__presentation">
                  <div className="desktop-reader__presentation-header">
                    <div>
                      <p className="desktop-reader__section-label">Reading environment</p>
                      <p className="desktop-reader__presentation-note">
                        Step 45 keeps these preferences inside the desktop shell store. Theme, font,
                        size, line height, and margin choices persist locally so the next app
                        session reopens with the same reading posture.
                      </p>
                    </div>
                    <div className="desktop-reader__presentation-summary">
                      <span className="desktop-reader__fact-label">Current profile</span>
                      <strong>{readerPresentationSummary}</strong>
                    </div>
                  </div>

                  <div className="desktop-reader__presentation-preview">
                    <p className="desktop-reader__section-label">Preview</p>
                    <h4 className="desktop-reader__presentation-title">
                      Typography should stay shell-owned until durable reader preferences arrive.
                    </h4>
                    <p className="desktop-reader__presentation-sample">
                      Selection, query scope, and article state still belong to their existing
                      boundaries. Step 45 only makes the reading surface more comfortable and more
                      accessible without promoting view preferences into shared contracts.
                    </p>
                  </div>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Theme</legend>
                    <div className="desktop-toolbar-pills">
                      {THEME_TONE_OPTIONS.map((option) => {
                        const active = themeTone === option.value

                        return (
                          <Button
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            key={option.value}
                            onClick={() => onSetThemeTone(option.value)}
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Font</legend>
                    <div className="desktop-toolbar-pills">
                      {FONT_FAMILY_OPTIONS.map((option) => {
                        const active = readerFontFamily === option.value

                        return (
                          <Button
                            aria-label={`${option.label}: ${option.note}`}
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            key={option.value}
                            onClick={() => onSetReaderFontFamily(option.value)}
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Size</legend>
                    <div className="desktop-toolbar-pills">
                      {FONT_SCALE_OPTIONS.map((option) => {
                        const active = readerFontScale === option.value

                        return (
                          <Button
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            key={option.value}
                            onClick={() => onSetReaderFontScale(option.value)}
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Line height</legend>
                    <div className="desktop-toolbar-pills">
                      {LINE_HEIGHT_OPTIONS.map((option) => {
                        const active = readerLineHeight === option.value

                        return (
                          <Button
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            key={option.value}
                            onClick={() => onSetReaderLineHeight(option.value)}
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="desktop-toolbar-group desktop-reader__control-group">
                    <legend className="desktop-toolbar-group__legend">Margins</legend>
                    <div className="desktop-toolbar-pills">
                      {MARGIN_OPTIONS.map((option) => {
                        const active = readerMarginMode === option.value

                        return (
                          <Button
                            aria-pressed={active}
                            className={
                              active ? "desktop-pill desktop-pill--active" : "desktop-pill"
                            }
                            key={option.value}
                            onClick={() => onSetReaderMarginMode(option.value)}
                            size="sm"
                            tone={active ? "neutral" : "ghost"}
                          >
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>
                </section>

                <section className="desktop-reader__body">
                  <div className="desktop-reader__body-header">
                    <div>
                      <p className="desktop-reader__section-label">Reading body</p>
                      <p className="desktop-reader__body-note">
                        Reader mode and reading presentation are both shell-local preferences. Step
                        46 now keeps text-selection capture and annotation replay in the reader
                        shell as well, while durable anchor storage still belongs to later
                        `core-domain/sqlite` work.
                      </p>
                    </div>
                    <div className="desktop-reader__body-meta">
                      <div>
                        <span className="desktop-reader__fact-label">Words</span>
                        <strong>{activeDetail.article.wordCount ?? "Unknown"}</strong>
                      </div>
                      <div>
                        <span className="desktop-reader__fact-label">Attachments</span>
                        <strong>{activeDetail.attachments.length}</strong>
                      </div>
                    </div>
                  </div>

                  <fieldset className="desktop-toolbar-group desktop-reader__mode-switch">
                    <legend className="desktop-toolbar-group__legend">Reader mode</legend>
                    <div className="desktop-toolbar-pills">
                      <Button
                        aria-pressed={readerContentMode === "extracted"}
                        className={
                          readerContentMode === "extracted"
                            ? "desktop-pill desktop-pill--active"
                            : "desktop-pill"
                        }
                        onClick={() => onSetReaderContentMode("extracted")}
                        size="sm"
                        tone={readerContentMode === "extracted" ? "neutral" : "ghost"}
                      >
                        Extracted content
                      </Button>
                      <Button
                        aria-pressed={readerContentMode === "raw"}
                        className={
                          readerContentMode === "raw"
                            ? "desktop-pill desktop-pill--active"
                            : "desktop-pill"
                        }
                        onClick={() => onSetReaderContentMode("raw")}
                        size="sm"
                        tone={readerContentMode === "raw" ? "neutral" : "ghost"}
                      >
                        Original content
                      </Button>
                    </div>
                    <p className="desktop-reader__mode-note">
                      Extracted mode prefers cleaned reading text. Original mode keeps the raw
                      source body visible for comparison and later extraction work.
                    </p>
                  </fieldset>

                  {readerContentMode === "extracted" && extractedParagraphs.length > 0 ? (
                    <div className="desktop-reader__content" ref={contentRef}>
                      {extractedParagraphs.map((paragraph, paragraphIndex) => (
                        <p
                          className="desktop-reader__paragraph"
                          data-reader-paragraph-index={paragraphIndex}
                          key={`${paragraphIndex}-${paragraph}`}
                        >
                          {renderAnnotatedParagraph(
                            paragraph,
                            paragraphIndex,
                            activeDetail.annotations,
                            searchHighlightTerms,
                          )}
                        </p>
                      ))}
                    </div>
                  ) : readerContentMode === "raw" && activeReaderContent ? (
                    <pre className="desktop-reader__raw-content">
                      {renderSearchHighlightedText(activeReaderContent, searchHighlightTerms)}
                    </pre>
                  ) : (
                    <div className="desktop-empty-state desktop-empty-state--compact">
                      <p className="desktop-empty-state__eyebrow">Body unavailable</p>
                      <h3>
                        {readerContentMode === "raw"
                          ? "This article does not expose original source content yet."
                          : "This article does not have extracted body text yet."}
                      </h3>
                      <p>
                        {alternateReaderContent
                          ? `Switch to ${
                              readerContentMode === "raw" ? "extracted" : "original"
                            } content to keep reading without changing the selected article.`
                          : "The reading panel still keeps summary and metadata visible so the route can switch cleanly without leaking content from the previously selected article."}
                      </p>
                    </div>
                  )}
                </section>

                <section className="desktop-reader__annotations">
                  <div className="desktop-reader__annotations-header">
                    <div>
                      <p className="desktop-reader__section-label">Highlights and notes</p>
                      <p className="desktop-reader__annotations-note">
                        Step 46 keeps annotation authoring in the desktop shell: select text from
                        extracted mode, capture one paragraph-scoped anchor, and replay the
                        resulting highlight or note from the resolved article detail without
                        changing shared DTO ownership.
                      </p>
                    </div>
                    <div className="desktop-reader__annotations-summary">
                      <span className="desktop-reader__fact-label">Anchored items</span>
                      <strong>{activeDetail.annotations.length}</strong>
                    </div>
                  </div>

                  <div className="desktop-reader__selection-card">
                    <div className="desktop-reader__selection-header">
                      <div>
                        <p className="desktop-reader__section-label">Current selection</p>
                        <p className="desktop-reader__selection-note">
                          Selection capture is only enabled for extracted reader paragraphs so the
                          shell can serialize one stable text anchor instead of raw markup ranges.
                        </p>
                      </div>
                      <div className="desktop-reader__selection-meta">
                        <span className="desktop-reader__fact-label">Pending annotation</span>
                        <strong>
                          {isCreatingAnnotation ? "Saving..." : pendingSelection ? "Ready" : "Idle"}
                        </strong>
                      </div>
                    </div>

                    {readerContentMode !== "extracted" ? (
                      <div className="desktop-empty-state desktop-empty-state--compact">
                        <p className="desktop-empty-state__eyebrow">Extracted mode required</p>
                        <h3>Switch back to extracted content to anchor highlights or notes.</h3>
                        <p>
                          Raw mode keeps the source body visible for inspection, but Step 46 only
                          captures anchors against the extracted reader text.
                        </p>
                      </div>
                    ) : pendingSelection ? (
                      <div className="desktop-reader__selection-details">
                        <div className="desktop-reader__selection-quote">
                          <span className="desktop-reader__fact-label">Selected text</span>
                          <blockquote>{pendingSelection.selectedText}</blockquote>
                        </div>
                        <div className="desktop-reader__selection-grid">
                          <div>
                            <span className="desktop-reader__fact-label">Paragraph</span>
                            <strong>{pendingSelection.anchor.paragraphIndex + 1}</strong>
                          </div>
                          <div>
                            <span className="desktop-reader__fact-label">Offsets</span>
                            <strong>
                              {pendingSelection.anchor.startOffset}-
                              {pendingSelection.anchor.endOffset}
                            </strong>
                          </div>
                        </div>

                        <label className="fr-field">
                          <span className="fr-field__label">Annotation note</span>
                          <textarea
                            aria-label="Annotation note"
                            className="fr-input desktop-reader__annotation-textarea"
                            id={annotationNoteId}
                            onChange={(event) => setAnnotationNoteDraft(event.target.value)}
                            placeholder="Optional for a highlight, required for a note."
                            value={annotationNoteDraft}
                          />
                        </label>

                        <div className="desktop-reader__annotation-actions">
                          <Button
                            disabled={isCreatingAnnotation}
                            onClick={() => handleCreateAnnotation("highlight")}
                            size="sm"
                            tone="neutral"
                          >
                            Create highlight
                          </Button>
                          <Button
                            disabled={isCreatingAnnotation}
                            onClick={() => handleCreateAnnotation("note")}
                            size="sm"
                            tone="ghost"
                          >
                            Create note
                          </Button>
                          <Button
                            disabled={isCreatingAnnotation}
                            onClick={clearPendingSelection}
                            size="sm"
                            tone="ghost"
                          >
                            Clear selection
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="desktop-empty-state desktop-empty-state--compact">
                        <p className="desktop-empty-state__eyebrow">Selection idle</p>
                        <h3>Select text inside one extracted paragraph.</h3>
                        <p>
                          The shell will capture offsets for that paragraph, then let you save a
                          highlight or a note without changing the current route or reader mode.
                        </p>
                      </div>
                    )}

                    {selectionErrorMessage || annotationErrorMessage ? (
                      <p className="desktop-reader__error" role="alert">
                        {selectionErrorMessage ?? annotationErrorMessage}
                      </p>
                    ) : null}
                  </div>

                  {activeDetail.annotations.length > 0 ? (
                    <ul className="desktop-reader__annotation-list">
                      {activeDetail.annotations.map((annotation) => {
                        const anchor = isReaderAnnotationAnchor(annotation.anchor)
                          ? annotation.anchor
                          : null

                        return (
                          <li className="desktop-reader__annotation-card" key={annotation.id}>
                            <div className="desktop-reader__annotation-card-header">
                              <div className="desktop-reader__annotation-badges">
                                <span
                                  className={`desktop-reader__annotation-badge desktop-reader__annotation-badge--${annotation.type}`}
                                  style={buildAnnotationStyle(annotation)}
                                >
                                  {formatAnnotationTypeLabel(annotation.type)}
                                </span>
                                <span className="desktop-reader__annotation-badge desktop-reader__annotation-badge--meta">
                                  {anchor
                                    ? `Paragraph ${anchor.paragraphIndex + 1}`
                                    : "Legacy anchor"}
                                </span>
                              </div>
                              <span className="desktop-reader__annotation-time">
                                {formatReaderDate(annotation.createdAt, annotation.createdAt)}
                              </span>
                            </div>
                            <blockquote className="desktop-reader__annotation-quote">
                              {annotation.selectedText}
                            </blockquote>
                            {annotation.note ? (
                              <p className="desktop-reader__annotation-note-copy">
                                {annotation.note}
                              </p>
                            ) : (
                              <p className="desktop-reader__annotation-note-copy desktop-reader__annotation-note-copy--empty">
                                No note body attached to this anchor.
                              </p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="desktop-empty-state desktop-empty-state--compact">
                      <p className="desktop-empty-state__eyebrow">No annotations yet</p>
                      <h3>This article does not have anchored reader notes yet.</h3>
                      <p>
                        New highlights and notes will appear here after you select extracted text
                        and save the annotation.
                      </p>
                    </div>
                  )}
                </section>

                <section className="desktop-reader__attachments">
                  <div className="desktop-reader__attachments-header">
                    <div>
                      <p className="desktop-reader__section-label">Attachments</p>
                      <p className="desktop-reader__attachments-note">
                        Step 42 makes attachment records visible in the reading panel. The shell
                        still only renders one resolved article detail object; enclosure discovery
                        and persistence remain below this boundary.
                      </p>
                    </div>
                    <div className="desktop-reader__attachments-summary">
                      <span className="desktop-reader__fact-label">Visible attachments</span>
                      <strong>{activeDetail.attachments.length}</strong>
                    </div>
                  </div>

                  {activeDetail.attachments.length > 0 ? (
                    <ul className="desktop-reader__attachment-list">
                      {activeDetail.attachments.map((attachment) => (
                        <li
                          className={`desktop-reader__attachment-card desktop-reader__attachment-card--${attachment.type}`}
                          key={attachment.id}
                        >
                          <div className="desktop-reader__attachment-header">
                            <div>
                              <p className="desktop-reader__section-label">
                                {formatAttachmentLabel(attachment.type)}
                              </p>
                              <h4 className="desktop-reader__attachment-title">
                                {formatAttachmentName(attachment.url)}
                              </h4>
                            </div>
                            <span className="desktop-reader__attachment-badge">
                              {attachment.type}
                            </span>
                          </div>

                          <p className="desktop-reader__attachment-url">{attachment.url}</p>

                          <div className="desktop-reader__attachment-facts">
                            <div>
                              <span className="desktop-reader__fact-label">Mime type</span>
                              <strong>{attachment.mimeType ?? "Unknown"}</strong>
                            </div>
                            <div>
                              <span className="desktop-reader__fact-label">Size</span>
                              <strong>{formatAttachmentSize(attachment.size)}</strong>
                            </div>
                            <div>
                              <span className="desktop-reader__fact-label">Duration</span>
                              <strong>
                                {attachment.type === "audio" || attachment.type === "video"
                                  ? formatAttachmentDuration(attachment.duration)
                                  : "Not timed"}
                              </strong>
                            </div>
                            <div>
                              <span className="desktop-reader__fact-label">Cache</span>
                              <strong>{attachment.localCachePath ?? "Not cached locally"}</strong>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="desktop-empty-state desktop-empty-state--compact">
                      <p className="desktop-empty-state__eyebrow">No attachments</p>
                      <h3>This article does not expose attachment metadata yet.</h3>
                      <p>
                        When feeds surface images, audio enclosures, video, or linked files, the
                        reader can present them here without changing the article-detail contract.
                      </p>
                    </div>
                  )}
                </section>

                <div className="desktop-reader__meta-group">
                  <div>
                    <span className="desktop-reader__fact-label">Primary link</span>
                    <p>{primaryUrl ?? "No canonical or original link yet."}</p>
                  </div>
                  <div>
                    <span className="desktop-reader__fact-label">Tag labels</span>
                    <p>
                      {activeDetail.tags.length > 0
                        ? activeDetail.tags.map((tag) => tag.name).join(", ")
                        : "No tags attached yet."}
                    </p>
                  </div>
                  <div>
                    <span className="desktop-reader__fact-label">Annotations</span>
                    <p>{activeDetail.annotations.length} anchored item(s) in the reader.</p>
                  </div>
                </div>
              </article>
            </div>
          </>
        ) : (
          <div className="desktop-empty-state">
            <p className="desktop-empty-state__eyebrow">Reader idle</p>
            <h3>Select an article once the queue has content.</h3>
            <p>
              Empty routes now reconcile their stale article ids away before the reader pane tries
              to render.
            </p>
          </div>
        )}
      </Surface>
    </SplitPane>
  )
}
