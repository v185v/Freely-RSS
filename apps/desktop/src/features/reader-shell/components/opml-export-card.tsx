import type { Ref } from "react"

import { Button, ListSection, Surface } from "@freelyrss/ui"

import type { OpmlExportReport } from "../types"

type OpmlExportCardProps = {
  errorMessage: string | null
  exportReport: OpmlExportReport | null
  exportedOpml: string | null
  isExporting: boolean
  onGenerateOpml: () => void
  textareaRef?: Ref<HTMLTextAreaElement>
}

export function OpmlExportCard({
  errorMessage,
  exportReport,
  exportedOpml,
  isExporting,
  onGenerateOpml,
  textareaRef,
}: OpmlExportCardProps) {
  return (
    <ListSection description="Export subscriptions as OPML" title="OPML export">
      <Surface className="desktop-export" compact>
        <label className="fr-field">
          <span className="fr-field__label">Exported OPML</span>
          <textarea
            aria-label="Exported OPML"
            className="fr-input desktop-export__textarea"
            placeholder="Generate OPML to export the current subscription tree."
            readOnly
            ref={textareaRef}
            rows={12}
            value={exportedOpml ?? ""}
          />
          <span className="fr-field__hint">Export includes folders and all current feed URLs.</span>
        </label>

        {exportReport ? (
          <div className="desktop-export__summary">
            <div>
              <span className="desktop-summary__label">Feeds exported</span>
              <strong>{exportReport.exportedFeedCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Folders exported</span>
              <strong>{exportReport.exportedFolderCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Generated at</span>
              <strong>{new Date(exportReport.generatedAt).toLocaleString()}</strong>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Export status</span>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button disabled={isExporting} onClick={onGenerateOpml} size="sm" tone="neutral">
            {isExporting ? "Generating..." : "Generate OPML"}
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
