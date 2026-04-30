import type { TagDto } from "@freelyrss/shared-types"
import { Button, ListSection, Surface } from "@freelyrss/ui"

import type { ReaderBatchOperationCommand, ReaderBatchOperationResult } from "../types"

type BatchOperationsCardProps = {
  availableTags: TagDto[]
  errorMessage: string | null
  isRunning: boolean
  onClearSelection: () => void
  onRunOperation: (command: ReaderBatchOperationCommand) => void
  onSelectAllVisible: () => void
  result: ReaderBatchOperationResult | null
  selectedArticleCount: number
  visibleArticleCount: number
}

function formatBatchAction(result: ReaderBatchOperationResult) {
  switch (result.report.action) {
    case "mark-read":
      return "Marked read"
    case "add-read-later":
      return "Added to read later"
    case "add-tag":
      return result.report.tagName ? `Added tag: ${result.report.tagName}` : "Added tag"
    case "delete-cache":
      return "Deleted cache"
  }
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${Math.round(value / (1024 * 1024))} MB`
}

export function BatchOperationsCard({
  availableTags,
  errorMessage,
  isRunning,
  onClearSelection,
  onRunOperation,
  onSelectAllVisible,
  result,
  selectedArticleCount,
  visibleArticleCount,
}: BatchOperationsCardProps) {
  const canRunOperation = selectedArticleCount > 0 && !isRunning

  return (
    <ListSection
      description="Stage 7 Step 58 keeps multi-article changes on a queue selection boundary, with execution delegated to a batch mutation instead of export formatters or reader rendering."
      title="Batch operations"
    >
      <Surface className="desktop-batch" compact>
        <div className="desktop-batch__summary">
          <div>
            <span className="desktop-summary__label">Selected</span>
            <strong>{selectedArticleCount}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Visible queue</span>
            <strong>{visibleArticleCount}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Last batch</span>
            <strong>{result ? formatBatchAction(result) : "None"}</strong>
          </div>
        </div>

        <div className="desktop-editor__actions">
          <Button
            disabled={visibleArticleCount === 0}
            onClick={onSelectAllVisible}
            size="sm"
            tone="neutral"
          >
            Select all visible
          </Button>
          <Button
            disabled={selectedArticleCount === 0}
            onClick={onClearSelection}
            size="sm"
            tone="ghost"
          >
            Clear selection
          </Button>
        </div>

        <fieldset className="desktop-toolbar-group">
          <legend className="desktop-toolbar-group__legend">State actions</legend>
          <div className="desktop-toolbar-pills">
            <Button
              disabled={!canRunOperation}
              onClick={() => onRunOperation({ action: "mark-read" })}
              size="sm"
              tone="neutral"
            >
              {isRunning ? "Updating..." : "Mark selected read"}
            </Button>
            <Button
              disabled={!canRunOperation}
              onClick={() => onRunOperation({ action: "add-read-later" })}
              size="sm"
              tone="ghost"
            >
              Add selected to read later
            </Button>
            <Button
              disabled={!canRunOperation}
              onClick={() => onRunOperation({ action: "delete-cache" })}
              size="sm"
              tone="ghost"
            >
              Delete selected cache
            </Button>
          </div>
        </fieldset>

        <fieldset className="desktop-toolbar-group">
          <legend className="desktop-toolbar-group__legend">Tag action</legend>
          <div className="desktop-toolbar-pills">
            {availableTags.map((tag) => (
              <Button
                disabled={!canRunOperation}
                key={tag.id}
                onClick={() =>
                  onRunOperation({
                    action: "add-tag",
                    tagId: tag.id,
                  })
                }
                size="sm"
                tone="ghost"
              >
                Add {tag.name} tag
              </Button>
            ))}
          </div>
        </fieldset>

        {result ? (
          <div className="desktop-batch__result">
            <div>
              <span className="desktop-summary__label">Articles changed</span>
              <strong>{result.report.changedArticleCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Skipped</span>
              <strong>{result.report.skippedArticleCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Cache entries</span>
              <strong>{result.report.evictedEntryCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Cache bytes</span>
              <strong>{formatBytes(result.report.evictedBytes)}</strong>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Batch status</span>
            <p>{errorMessage}</p>
          </div>
        ) : null}
      </Surface>
    </ListSection>
  )
}
