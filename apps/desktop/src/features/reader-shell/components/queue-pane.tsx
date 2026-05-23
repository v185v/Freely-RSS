import { useEffect, useRef } from "react"
import type { ChangeEvent, Ref } from "react"
import { useTranslation } from "react-i18next"

import type { ArticleListItemDto } from "@freelyrss/shared-types"
import { Button, ListRow, ListSection, SplitPane, Surface, TextInput } from "@freelyrss/ui"
import { useVirtualizer } from "@tanstack/react-virtual"

import {
  QUEUE_ARTICLE_OVERSCAN,
  QUEUE_ARTICLE_ROW_ESTIMATE,
  observeQueueViewportRect,
} from "../queue-virtualization"
import { renderMarkedText } from "../search-highlighting"
import { formatArticleMeta } from "../selectors"
import { READER_STATUS_FILTER_OPTIONS } from "../types"
import type { ReaderDensityMode, ReaderSortMode, ReaderStatusFilter, SourceRow } from "../types"

type QueuePaneProps = {
  activeArticleId: string | null
  activeSource: SourceRow
  densityMode: ReaderDensityMode
  describedBy?: string
  headingId: string
  onSearchTextChange: (searchText: string) => void
  onSelectArticle: (articleId: string) => void
  onSetDensityMode: (mode: ReaderDensityMode) => void
  onSetSortMode: (sortMode: ReaderSortMode) => void
  onSetStatusFilter: (statusFilter: ReaderStatusFilter) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  queryResetKey: string
  searchText: string
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
  visibleArticles: ArticleListItemDto[]
}

function renderArticleSummary(article: ArticleListItemDto) {
  if (article.searchSnippet) {
    return (
      <span className="desktop-queue__search-snippet">
        {renderMarkedText(article.searchSnippet, "desktop-queue__search-mark")}
      </span>
    )
  }

  return article.summary ?? null
}

export function QueuePane({
  activeArticleId,
  activeSource,
  densityMode,
  describedBy,
  headingId,
  onSearchTextChange,
  onSelectArticle,
  onSetDensityMode,
  onSetSortMode,
  onSetStatusFilter,
  paneId,
  paneRef,
  queryResetKey,
  searchText,
  sortMode,
  statusFilter,
  visibleArticles,
}: QueuePaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { t } = useTranslation()

  function handleSearchTextChange(event: ChangeEvent<HTMLInputElement>) {
    onSearchTextChange(event.target.value)
  }

  const rowVirtualizer = useVirtualizer({
    count: visibleArticles.length,
    estimateSize: () => QUEUE_ARTICLE_ROW_ESTIMATE,
    getItemKey: (index) => visibleArticles[index]?.id ?? index,
    getScrollElement: () => scrollRef.current,
    observeElementRect: observeQueueViewportRect,
    overscan: QUEUE_ARTICLE_OVERSCAN,
  })

  useEffect(() => {
    if (!scrollRef.current || queryResetKey.length === 0) {
      return
    }

    scrollRef.current.scrollTop = 0
  }, [queryResetKey])

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalHeight = rowVirtualizer.getTotalSize()

  return (
    <SplitPane
      aria-describedby={describedBy}
      aria-keyshortcuts="Alt+3"
      aria-labelledby={headingId}
      className="desktop-pane"
      id={paneId}
      ref={paneRef}
      tabIndex={-1}
    >
      <Surface className="desktop-pane__surface desktop-pane__surface--queue">
        <div className="desktop-pane__header">
          <h2 id={headingId}>{t("queue.title")}</h2>
          <p className="desktop-pane__focus-title">{activeSource.title}</p>
        </div>

        <div className="desktop-pane__toolbar">
          <TextInput
            aria-label={t("queue.filterLabel")}
            label={t("queue.filterLabel")}
            onChange={handleSearchTextChange}
            placeholder={t("queue.filterPlaceholder")}
            value={searchText}
          />

          <fieldset className="desktop-toolbar-group">
            <legend className="desktop-toolbar-group__legend">{t("queue.viewPresets")}</legend>
            <div className="desktop-toolbar-pills">
              {READER_STATUS_FILTER_OPTIONS.map((option) => {
                const active = option.value === statusFilter

                return (
                  <Button
                    aria-pressed={active}
                    className={active ? "desktop-pill desktop-pill--active" : "desktop-pill"}
                    key={option.value}
                    onClick={() => onSetStatusFilter(option.value)}
                    size="sm"
                    tone={active ? "neutral" : "ghost"}
                  >
                    {t(option.labelKey)}
                  </Button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="desktop-toolbar-group">
            <legend className="desktop-toolbar-group__legend">{t("queue.sortMode")}</legend>
            <div className="desktop-toolbar-pills">
              <Button
                aria-pressed={sortMode === "newest"}
                className={
                  sortMode === "newest" ? "desktop-pill desktop-pill--active" : "desktop-pill"
                }
                onClick={() => onSetSortMode("newest")}
                size="sm"
                tone={sortMode === "newest" ? "neutral" : "ghost"}
              >
                {t("queue.sortNewest")}
              </Button>
              <Button
                aria-pressed={sortMode === "oldest"}
                className={
                  sortMode === "oldest" ? "desktop-pill desktop-pill--active" : "desktop-pill"
                }
                onClick={() => onSetSortMode("oldest")}
                size="sm"
                tone={sortMode === "oldest" ? "neutral" : "ghost"}
              >
                {t("queue.sortOldest")}
              </Button>
            </div>
          </fieldset>

          <div className="density-toggle">
            <button
              className={
                densityMode === "compact"
                  ? "density-toggle__btn density-toggle__btn--active"
                  : "density-toggle__btn"
              }
              onClick={() => onSetDensityMode("compact")}
              type="button"
            >
              {t("queue.compact")}
            </button>
            <button
              className={
                densityMode === "comfortable"
                  ? "density-toggle__btn density-toggle__btn--active"
                  : "density-toggle__btn"
              }
              onClick={() => onSetDensityMode("comfortable")}
              type="button"
            >
              {t("queue.comfortable")}
            </button>
          </div>
        </div>

        <div className="desktop-pane__scroll desktop-pane__scroll--queue" ref={scrollRef}>
          {visibleArticles.length > 0 ? (
            <div className="desktop-virtual-list" style={{ height: totalHeight }}>
              {virtualRows.map((virtualRow) => {
                const article = visibleArticles[virtualRow.index]

                if (!article) {
                  return null
                }

                return (
                  <div
                    className="desktop-virtual-list__item"
                    data-virtual-index={virtualRow.index}
                    key={article.id}
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ListRow
                      active={activeArticleId === article.id}
                      aria-current={activeArticleId === article.id ? "page" : undefined}
                      className={`desktop-article-row queue-item--${densityMode}`}
                      eyebrow={article.feedTitle}
                      meta={formatArticleMeta(article)}
                      onClick={() => onSelectArticle(article.id)}
                      summary={renderArticleSummary(article)}
                      title={article.title}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="desktop-empty-state">
              <h3>{t("queue.emptyTitle")}</h3>
              <p>{t("queue.emptyMessage")}</p>
            </div>
          )}
        </div>
      </Surface>
    </SplitPane>
  )
}
