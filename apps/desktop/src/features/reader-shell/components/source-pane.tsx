import { type CSSProperties, type Ref, useRef } from "react"

import type { FeedDto } from "@freelyrss/shared-types"
import { Button, ListRow, ListSection, SplitPane, Surface } from "@freelyrss/ui"

import type { OpmlExportReport, OpmlImportReport, SourceRow, SubscriptionTreeRow } from "../types"
import { FeedEditorCard } from "./feed-editor-card"
import { OpmlExportCard } from "./opml-export-card"
import { OpmlImportCard } from "./opml-import-card"

type SourcePaneProps = {
  activeSourceId: string
  activeFeed: FeedDto | null
  canCollapseFolders: boolean
  describedBy?: string
  editorErrorMessage: string | null
  exportErrorMessage: string | null
  exportReport: OpmlExportReport | null
  exportedOpml: string | null
  headingId: string
  importErrorMessage: string | null
  importReport: OpmlImportReport | null
  isExportingOpml: boolean
  isImportingOpml: boolean
  isRefreshingFeed: boolean
  isSavingFeed: boolean
  onCollapseAllFolders: () => void
  onExportOpml: () => void
  onImportOpml: (opmlText: string) => void
  onRefreshFeed: (feedId: FeedDto["id"]) => void
  onSelectSource: (sourceId: string) => void
  onSaveFeed: (input: {
    customName: string | null
    feedId: FeedDto["id"]
    icon: string | null
    title: string
    updateInterval: number | null
  }) => void
  onToggleFolderCollapsed: (folderId: string) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  quickViewSection: {
    description: string
    rows: SourceRow[]
    title: string
  }
  subscriptionRows: SubscriptionTreeRow[]
}

export function SourcePane({
  activeSourceId,
  activeFeed,
  canCollapseFolders,
  describedBy,
  editorErrorMessage,
  exportErrorMessage,
  exportReport,
  exportedOpml,
  headingId,
  importErrorMessage,
  importReport,
  isExportingOpml,
  isImportingOpml,
  isRefreshingFeed,
  isSavingFeed,
  onCollapseAllFolders,
  onExportOpml,
  onImportOpml,
  onRefreshFeed,
  onSelectSource,
  onSaveFeed,
  onToggleFolderCollapsed,
  paneId,
  paneRef,
  quickViewSection,
  subscriptionRows,
}: SourcePaneProps) {
  const importTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const exportTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  return (
    <SplitPane
      aria-describedby={describedBy}
      aria-keyshortcuts="Alt+2"
      aria-labelledby={headingId}
      className="desktop-pane"
      id={paneId}
      ref={paneRef}
      tabIndex={-1}
    >
      <Surface className="desktop-pane__surface desktop-pane__surface--nav">
        <div className="desktop-pane__header">
          <p className="desktop-pane__eyebrow">Left pane</p>
          <h2 id={headingId}>Sources</h2>
          <p className="desktop-pane__description">
            Quick views stay route-backed, folder expansion remains local shell state, and feed
            editing plus OPML portability now live beside source selection instead of leaking into
            shared DTO assembly.
          </p>
        </div>

        <div className="desktop-pane__scroll">
          <ListSection description={quickViewSection.description} title={quickViewSection.title}>
            {quickViewSection.rows.map((row) => (
              <ListRow
                active={row.id === activeSourceId}
                aria-current={row.id === activeSourceId ? "page" : undefined}
                className="desktop-source-row"
                eyebrow={row.eyebrow}
                key={row.id}
                meta={row.meta}
                onClick={() => onSelectSource(row.id)}
                summary={row.description}
                title={row.title}
              />
            ))}
          </ListSection>

          <ListSection
            actions={
              <div className="desktop-tree__actions">
                <Button
                  onClick={canCollapseFolders ? onCollapseAllFolders : undefined}
                  size="sm"
                  tone="ghost"
                >
                  Collapse groups
                </Button>
              </div>
            }
            description="Folder and feed placeholders shaped like the future left navigation tree."
            title="Subscription tree"
          >
            <ul className="desktop-tree">
              {subscriptionRows.map((row) => (
                <li
                  className="desktop-tree__item"
                  key={row.id}
                  style={{ "--tree-depth": row.depth } as CSSProperties}
                >
                  {row.kind === "folder" && row.hasChildren ? (
                    <button
                      aria-expanded={!row.isCollapsed}
                      aria-label={row.isCollapsed ? `Expand ${row.title}` : `Collapse ${row.title}`}
                      className="desktop-tree__toggle"
                      onClick={() => onToggleFolderCollapsed(row.id)}
                      type="button"
                    >
                      {row.isCollapsed ? "+" : "-"}
                    </button>
                  ) : (
                    <span aria-hidden="true" className="desktop-tree__toggle-spacer" />
                  )}

                  <ListRow
                    active={row.id === activeSourceId}
                    aria-current={row.id === activeSourceId ? "page" : undefined}
                    className={
                      row.kind === "folder"
                        ? "desktop-source-row desktop-tree__row desktop-tree__row--folder"
                        : "desktop-source-row desktop-tree__row desktop-tree__row--feed"
                    }
                    eyebrow={row.eyebrow}
                    meta={row.meta}
                    onClick={() => onSelectSource(row.id)}
                    summary={row.description}
                    title={row.title}
                  />
                </li>
              ))}
            </ul>
          </ListSection>

          <FeedEditorCard
            errorMessage={editorErrorMessage}
            feed={activeFeed}
            isRefreshing={isRefreshingFeed}
            isSaving={isSavingFeed}
            onRefreshFeed={onRefreshFeed}
            onSaveFeed={onSaveFeed}
          />

          <OpmlImportCard
            errorMessage={importErrorMessage}
            importReport={importReport}
            isImporting={isImportingOpml}
            onImportOpml={onImportOpml}
            textareaRef={importTextareaRef}
          />

          <OpmlExportCard
            errorMessage={exportErrorMessage}
            exportReport={exportReport}
            exportedOpml={exportedOpml}
            isExporting={isExportingOpml}
            onGenerateOpml={onExportOpml}
            textareaRef={exportTextareaRef}
          />
        </div>

        <div className="desktop-pane__footer">
          <Button size="sm" tone="ghost">
            Add source
          </Button>
          <Button onClick={() => importTextareaRef.current?.focus()} size="sm" tone="neutral">
            Import OPML
          </Button>
          <Button onClick={() => exportTextareaRef.current?.focus()} size="sm" tone="ghost">
            Export OPML
          </Button>
        </div>
      </Surface>
    </SplitPane>
  )
}
