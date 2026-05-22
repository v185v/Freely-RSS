import { type Ref, useEffect, useState } from "react"

import { Button, ListSection, Surface } from "@freelyrss/ui"

import type { OpmlImportReport } from "../types"

type OpmlImportCardProps = {
  errorMessage: string | null
  importReport: OpmlImportReport | null
  isImporting: boolean
  onImportOpml: (opmlText: string) => void
  textareaRef?: Ref<HTMLTextAreaElement>
}

export function OpmlImportCard({
  errorMessage,
  importReport,
  isImporting,
  onImportOpml,
  textareaRef,
}: OpmlImportCardProps) {
  const [draft, setDraft] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isImporting && importReport) {
      setDraft("")
      setLocalError(null)
    }
  }, [importReport, isImporting])

  function handleImport() {
    const normalized = draft.trim()

    if (normalized.length === 0) {
      setLocalError("Paste OPML before starting an import.")
      return
    }

    setLocalError(null)
    onImportOpml(normalized)
  }

  return (
    <ListSection description="Import subscriptions from OPML" title="OPML import">
      <Surface className="desktop-import" compact>
        <label className="fr-field">
          <span className="fr-field__label">OPML payload</span>
          <textarea
            aria-label="OPML payload"
            className="fr-input desktop-import__textarea"
            onChange={(event) => {
              setDraft(event.target.value)
              setLocalError(null)
            }}
            placeholder={`<opml version="2.0">\n  <body>\n    <outline text="Research">\n      <outline text="Example feed" type="rss" xmlUrl="https://example.com/feed.xml" />\n    </outline>\n  </body>\n</opml>`}
            ref={textareaRef}
            rows={12}
            value={draft}
          />
          <span className="fr-field__hint">
            Nested outlines become folders, outlines with `xmlUrl` become feeds, and duplicate feed
            URLs are skipped.
          </span>
        </label>

        {importReport ? (
          <div className="desktop-import__summary">
            <div>
              <span className="desktop-summary__label">Feeds imported</span>
              <strong>{importReport.createdFeedCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Folders created</span>
              <strong>{importReport.createdFolderCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Duplicates skipped</span>
              <strong>{importReport.duplicateFeedCount}</strong>
            </div>
          </div>
        ) : null}

        {localError || errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Import status</span>
            <p>{localError ?? errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button disabled={isImporting} onClick={handleImport} size="sm" tone="neutral">
            {isImporting ? "Importing..." : "Import OPML"}
          </Button>
          <Button
            disabled={isImporting}
            onClick={() => {
              setDraft("")
              setLocalError(null)
            }}
            size="sm"
            tone="ghost"
          >
            Reset draft
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
