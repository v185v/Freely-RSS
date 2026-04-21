import type { Ref } from "react"

import type { ArticleDetailDto } from "@freelyrss/shared-types"
import { Button, SplitPane, Surface } from "@freelyrss/ui"

import { formatReaderProgress } from "../selectors"
import type { ReaderContentMode } from "../types"

type ReaderPaneProps = {
  activeDetail: ArticleDetailDto | null
  describedBy?: string
  headingId: string
  onSetReaderContentMode: (readerContentMode: ReaderContentMode) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  readerContentMode: ReaderContentMode
}

function formatReaderDate(value: string | null) {
  if (!value) {
    return "No publish time yet"
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

export function ReaderPane({
  activeDetail,
  describedBy,
  headingId,
  onSetReaderContentMode,
  paneId,
  paneRef,
  readerContentMode,
}: ReaderPaneProps) {
  const extractedContent = activeDetail?.article.contentExtracted?.trim() ?? null
  const rawContent = activeDetail?.article.contentRaw?.trim() ?? null
  const extractedParagraphs = extractedContent
    ?.split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
  const activeReaderContent = readerContentMode === "raw" ? rawContent : extractedContent
  const alternateReaderContent = readerContentMode === "raw" ? extractedContent : rawContent
  const primaryUrl = activeDetail?.article.canonicalUrl ?? activeDetail?.article.originalUrl ?? null

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
            The selected article still comes from route state, but Step 40 adds an explicit reader
            content mode on top of the Step 39 base view: extracted text and original source content
            can now be inspected separately without changing article selection.
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
                <span className="desktop-reader__fact-label">Language</span>
                <strong>{activeDetail.article.language ?? "Unknown"}</strong>
              </div>
            </div>

            <div className="desktop-pane__scroll desktop-pane__scroll--reader">
              <article className="desktop-reader__article">
                <header className="desktop-reader__article-header">
                  <p className="desktop-reader__section-label">Selected article</p>
                  <h3 className="desktop-reader__article-title">{activeDetail.article.title}</h3>
                  <p className="desktop-reader__summary">
                    {activeDetail.article.summary ??
                      "This article does not expose a summary yet, so the reading panel falls back to the extracted body."}
                  </p>
                </header>

                <section className="desktop-reader__body">
                  <div className="desktop-reader__body-header">
                    <div>
                      <p className="desktop-reader__section-label">Reading body</p>
                      <p className="desktop-reader__body-note">
                        Reader mode is a shell-local preference. The latest selection is stored
                        locally so the next reader session reopens in the same content mode.
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

                  {readerContentMode === "extracted" &&
                  extractedParagraphs &&
                  extractedParagraphs.length > 0 ? (
                    <div className="desktop-reader__content">
                      {extractedParagraphs.map((paragraph) => (
                        <p className="desktop-reader__paragraph" key={paragraph}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : readerContentMode === "raw" && activeReaderContent ? (
                    <pre className="desktop-reader__raw-content">{activeReaderContent}</pre>
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
                    <p>{activeDetail.annotations.length} note(s) anchored in the reader.</p>
                  </div>
                </div>
              </article>
            </div>

            <div className="desktop-pane__footer">
              <Button size="sm" tone="neutral">
                Mark read
              </Button>
              <Button size="sm" tone="ghost">
                Toggle star
              </Button>
              <Button size="sm" tone="ghost">
                Open source link
              </Button>
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
