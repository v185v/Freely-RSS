import { type CSSProperties, type Ref, useState } from "react"
import { useTranslation } from "react-i18next"

import type { FeedDto } from "@freelyrss/shared-types"
import { Button, ListRow, ListSection, SplitPane, Surface, TextInput } from "@freelyrss/ui"

import type { SourceRow, SubscriptionTreeRow } from "../types"

type SourcePaneProps = {
  activeSourceId: string
  canCollapseFolders: boolean
  canRefresh: boolean
  describedBy?: string
  headingId: string
  onAddFeed: (url: string) => void
  onCollapseAllFolders: () => void
  onImportOpml: (opmlText: string) => void
  onRefreshFeed: () => void
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
  canRefresh,
  describedBy,
  headingId,
  onAddFeed,
  onCollapseAllFolders,
  onImportOpml,
  onRefreshFeed,
  onSelectSource,
  onToggleFolderCollapsed,
  paneId,
  paneRef,
  quickViewSection,
  smartFolderSection,
  subscriptionRows,
}: SourcePaneProps) {
  const { t } = useTranslation()
  const [panel, setPanel] = useState<"add" | "import" | null>(null)
  const [feedUrl, setFeedUrl] = useState("")
  const [opmlText, setOpmlText] = useState("")

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
          {canRefresh && (
            <button className="desktop-pane__header-action" onClick={onRefreshFeed} type="button">
              {t("source.refresh")}
            </button>
          )}
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

        {panel === "add" && (
          <div className="desktop-pane__panel">
            <div className="desktop-pane__panel-header">
              <strong>{t("source.addSource")}</strong>
              <button
                className="desktop-pane__panel-close"
                onClick={() => setPanel(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <TextInput
              label={t("source.feedUrlLabel")}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder={t("source.feedUrlPlaceholder")}
              value={feedUrl}
            />
            <Button
              onClick={() => {
                if (feedUrl.trim()) {
                  onAddFeed(feedUrl.trim())
                  setFeedUrl("")
                  setPanel(null)
                }
              }}
              size="sm"
              tone="neutral"
            >
              {t("source.addConfirm")}
            </Button>
          </div>
        )}

        {panel === "import" && (
          <div className="desktop-pane__panel">
            <div className="desktop-pane__panel-header">
              <strong>{t("source.importOpml")}</strong>
              <button
                className="desktop-pane__panel-close"
                onClick={() => setPanel(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <textarea
              className="desktop-pane__panel-textarea"
              onChange={(e) => setOpmlText(e.target.value)}
              placeholder={t("source.importPlaceholder")}
              rows={6}
              value={opmlText}
            />
            <Button
              onClick={() => {
                if (opmlText.trim()) {
                  onImportOpml(opmlText.trim())
                  setOpmlText("")
                  setPanel(null)
                }
              }}
              size="sm"
              tone="neutral"
            >
              {t("source.importConfirm")}
            </Button>
          </div>
        )}

        <div className="desktop-pane__footer">
          <Button onClick={() => setPanel(panel === "add" ? null : "add")} size="sm" tone="ghost">
            {t("source.addSource")}
          </Button>
          <Button
            onClick={() => setPanel(panel === "import" ? null : "import")}
            size="sm"
            tone="neutral"
          >
            {t("source.importOpml")}
          </Button>
        </div>
      </Surface>
    </SplitPane>
  )
}
