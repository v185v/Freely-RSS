import type { ArticleDetailDto } from "@freelyrss/shared-types"
import { Button, SplitPane, Surface } from "@freelyrss/ui"

import { formatReaderProgress } from "../selectors"

type ReaderPaneProps = {
  activeDetail: ArticleDetailDto | null
}

export function ReaderPane({ activeDetail }: ReaderPaneProps) {
  const readerParagraphs = activeDetail?.article.contentExtracted?.split("\n\n") ?? []

  return (
    <SplitPane aria-label="Reading panel" className="desktop-pane">
      <Surface className="desktop-pane__surface desktop-pane__surface--reader">
        {activeDetail ? (
          <>
            <div className="desktop-pane__header">
              <p className="desktop-pane__eyebrow">Right pane</p>
              <h2>{activeDetail.article.title}</h2>
              <p className="desktop-pane__description">
                The selected article now comes from route state and is reconciled against the
                current queue before this pane renders.
              </p>
            </div>

            <div className="desktop-reader__facts">
              <div>
                <span className="desktop-reader__fact-label">Feed</span>
                <strong>{activeDetail.feed.displayTitle}</strong>
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
                <span className="desktop-reader__fact-label">Tags</span>
                <strong>{activeDetail.tags.length}</strong>
              </div>
            </div>

            <div className="desktop-pane__scroll desktop-pane__scroll--reader">
              <p className="desktop-reader__summary">{activeDetail.article.summary}</p>

              <div className="desktop-reader__content">
                {readerParagraphs.map((paragraph) => (
                  <p className="desktop-reader__paragraph" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="desktop-reader__meta-group">
                <div>
                  <span className="desktop-reader__fact-label">Tag labels</span>
                  <p>{activeDetail.tags.map((tag) => tag.name).join(", ")}</p>
                </div>
                <div>
                  <span className="desktop-reader__fact-label">Annotations</span>
                  <p>{activeDetail.annotations.length} placeholder note(s)</p>
                </div>
                <div>
                  <span className="desktop-reader__fact-label">Attachments</span>
                  <p>{activeDetail.attachments.length} linked asset slot(s)</p>
                </div>
              </div>
            </div>

            <div className="desktop-pane__footer">
              <Button size="sm" tone="neutral">
                Mark read
              </Button>
              <Button size="sm" tone="ghost">
                Toggle star
              </Button>
              <Button size="sm" tone="ghost">
                Add note
              </Button>
            </div>
          </>
        ) : (
          <div className="desktop-empty-state desktop-empty-state--reader">
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
