import { type CSSProperties, type Ref, useRef } from "react"
import { useTranslation } from "react-i18next"

import type { FeedDto } from "@freelyrss/shared-types"
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
    rows: SourceRow[]
    title: string
  }
  smartFolderSection: {
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
  smartFolderSection,
  subscriptionRows,
}: SourcePaneProps) {
  const { t } = useTranslation()

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
          <h2 id={headingId}>{t("source.title")}</h2>
        </div>

        <div className="desktop-pane__scroll">
          <ListSection title={quickViewSection.title}>
            {quickViewSection.rows.map((row) => (
              <ListRow
                active={row.id === activeSourceId}
                aria-current={row.id === activeSourceId ? "page" : undefined}
                className="desktop-source-row"
                key={row.id}
                meta={row.meta}
                onClick={() => onSelectSource(row.id)}
                title={row.title}
              />
            ))}
          </ListSection>

          <ListSection title={smartFolderSection.title}>
            {smartFolderSection.rows.map((row) => (
              <ListRow
                active={row.id === activeSourceId}
                aria-current={row.id === activeSourceId ? "page" : undefined}
                className="desktop-source-row"
                key={row.id}
                meta={row.meta}
                onClick={() => onSelectSource(row.id)}
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
                  {t("source.collapseGroups")}
                </Button>
              </div>
            }
            title={t("source.subscriptionTree")}
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
                      aria-label={
                        row.isCollapsed
                          ? t("source.expandFolder", { name: row.title })
                          : t("source.collapseFolder", { name: row.title })
                      }
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
                    meta={row.meta}
                    onClick={() => onSelectSource(row.id)}
                    title={row.title}
                  />
                </li>
              ))}
            </ul>
          </ListSection>
        </div>

        <div className="desktop-pane__footer">
          <Button size="sm" tone="ghost">
            {t("source.addSource")}
          </Button>
        </div>
      </Surface>
    </SplitPane>
  )
}
