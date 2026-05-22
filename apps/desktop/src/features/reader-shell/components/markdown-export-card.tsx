import type { Ref } from "react"

import { Button, ListSection, Surface } from "@freelyrss/ui"

import type { ReaderMarkdownExportResult } from "../types"

type MarkdownExportCardProps = {
  errorMessage: string | null
  exportResult: ReaderMarkdownExportResult | null
  hasActiveArticle: boolean
  isExporting: boolean
  onExportBatch: () => void
  onExportSingle: () => void
  textareaRef?: Ref<HTMLTextAreaElement>
  visibleArticleCount: number
}

function formatExportMode(result: ReaderMarkdownExportResult) {
  return result.report.mode === "single" ? "single article" : "visible queue"
}

export function MarkdownExportCard({
  errorMessage,
  exportResult,
  hasActiveArticle,
  isExporting,
  onExportBatch,
  onExportSingle,
  textareaRef,
  visibleArticleCount,
}: MarkdownExportCardProps) {
  return (
    <ListSection description="Export articles as Markdown" title="Markdown export">
      <Surface className="desktop-export desktop-markdown-export" compact>
        <label className="fr-field">
          <span className="fr-field__label">Exported Markdown</span>
          <textarea
            aria-label="Exported Markdown"
            className="fr-input desktop-export__textarea desktop-markdown-export__textarea"
            placeholder="Generate Markdown for the selected article or the current visible queue."
            readOnly
            ref={textareaRef}
            rows={14}
            value={exportResult?.markdownText ?? ""}
          />
          <span className="fr-field__hint">
            Export keeps article metadata, readable body content, annotations, and attachment
            references in one portable Markdown document.
          </span>
        </label>

        {exportResult ? (
          <div className="desktop-export__summary">
            <div>
              <span className="desktop-summary__label">Articles exported</span>
              <strong>{exportResult.report.exportedArticleCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Annotations</span>
              <strong>{exportResult.report.annotationCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Mode</span>
              <strong>{formatExportMode(exportResult)}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">File name</span>
              <strong>{exportResult.fileName}</strong>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Markdown export status</span>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button
            disabled={isExporting || !hasActiveArticle}
            onClick={onExportSingle}
            size="sm"
            tone="neutral"
          >
            {isExporting ? "Generating..." : "Export selected article"}
          </Button>
          <Button
            disabled={isExporting || visibleArticleCount === 0}
            onClick={onExportBatch}
            size="sm"
            tone="ghost"
          >
            Export visible queue
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
