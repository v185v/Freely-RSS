import type { CSSProperties, Ref } from "react"

import { Button, ListRow, ListSection, SplitPane, Surface } from "@freelyrss/ui"

import type { SourceRow, SubscriptionTreeRow } from "../types"

type SourcePaneProps = {
  activeSourceId: string
  canCollapseFolders: boolean
  describedBy?: string
  headingId: string
  onCollapseAllFolders: () => void
  onSelectSource: (sourceId: string) => void
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
  canCollapseFolders,
  describedBy,
  headingId,
  onCollapseAllFolders,
  onSelectSource,
  onToggleFolderCollapsed,
  paneId,
  paneRef,
  quickViewSection,
  subscriptionRows,
}: SourcePaneProps) {
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
            Quick views stay route-backed, while folder expansion and collapse remain local shell
            interaction state.
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
        </div>

        <div className="desktop-pane__footer">
          <Button size="sm" tone="ghost">
            Add source
          </Button>
          <Button size="sm" tone="neutral">
            Import OPML
          </Button>
        </div>
      </Surface>
    </SplitPane>
  )
}
