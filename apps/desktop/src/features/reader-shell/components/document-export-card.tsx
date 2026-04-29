import type { Ref } from "react"

import { Button, ListSection, Surface } from "@freelyrss/ui"

import type { ReaderDocumentExportFormat, ReaderDocumentExportResult } from "../types"

type DocumentExportCardProps = {
  errorMessage: string | null
  exportResult: ReaderDocumentExportResult | null
  hasActiveArticle: boolean
  isExporting: boolean
  onExportBatch: (format: ReaderDocumentExportFormat) => void
  onExportSingle: (format: ReaderDocumentExportFormat) => void
  textareaRef?: Ref<HTMLTextAreaElement>
  visibleArticleCount: number
}

function formatExportMode(result: ReaderDocumentExportResult) {
  return result.report.mode === "single" ? "single article" : "visible queue"
}

function formatExportFormat(result: ReaderDocumentExportResult) {
  return result.report.format === "pdf" ? "PDF print source" : "HTML document"
}

export function DocumentExportCard({
  errorMessage,
  exportResult,
  hasActiveArticle,
  isExporting,
  onExportBatch,
  onExportSingle,
  textareaRef,
  visibleArticleCount,
}: DocumentExportCardProps) {
  return (
    <ListSection
      description="Stage 7 Step 57 keeps HTML and PDF output beside the Markdown formatter, with both formats consuming the same resolved article-detail inputs and current reader presentation settings."
      title="HTML/PDF export"
    >
      <Surface className="desktop-export desktop-document-export" compact>
        <label className="fr-field">
          <span className="fr-field__label">Exported document source</span>
          <textarea
            aria-label="Exported document source"
            className="fr-input desktop-export__textarea desktop-document-export__textarea"
            placeholder="Generate HTML or a PDF print source for the selected article or current visible queue."
            readOnly
            ref={textareaRef}
            rows={14}
            value={exportResult?.documentText ?? ""}
          />
          <span className="fr-field__hint">
            HTML output is standalone. PDF output is a print-ready HTML document for the desktop
            print pipeline and keeps the target file name as a PDF artifact.
          </span>
        </label>

        {exportResult ? (
          <div className="desktop-export__summary">
            <div>
              <span className="desktop-summary__label">Articles exported</span>
              <strong>{exportResult.report.exportedArticleCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Format</span>
              <strong>{formatExportFormat(exportResult)}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Mode</span>
              <strong>{formatExportMode(exportResult)}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">File name</span>
              <strong>{exportResult.fileName}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Attachments</span>
              <strong>{exportResult.report.attachmentCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Reader view</span>
              <strong>{exportResult.report.presentationSummary}</strong>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">HTML/PDF export status</span>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button
            disabled={isExporting || !hasActiveArticle}
            onClick={() => onExportSingle("html")}
            size="sm"
            tone="neutral"
          >
            {isExporting ? "Generating..." : "Export selected HTML"}
          </Button>
          <Button
            disabled={isExporting || !hasActiveArticle}
            onClick={() => onExportSingle("pdf")}
            size="sm"
            tone="ghost"
          >
            Prepare selected PDF
          </Button>
          <Button
            disabled={isExporting || visibleArticleCount === 0}
            onClick={() => onExportBatch("html")}
            size="sm"
            tone="ghost"
          >
            Export queue HTML
          </Button>
          <Button
            disabled={isExporting || visibleArticleCount === 0}
            onClick={() => onExportBatch("pdf")}
            size="sm"
            tone="ghost"
          >
            Prepare queue PDF
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
