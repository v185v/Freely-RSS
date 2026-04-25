import { useEffect, useRef } from "react"
import type { ChangeEvent, Ref } from "react"

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
import type {
  ReaderArticleQuerySummary,
  ReaderSortMode,
  ReaderStatusFilter,
  SourceRow,
} from "../types"

type QueuePaneProps = {
  activeArticleId: string | null
  activeSource: SourceRow
  describedBy?: string
  headingId: string
  onSearchTextChange: (searchText: string) => void
  onSelectArticle: (articleId: string) => void
  onSetSortMode: (sortMode: ReaderSortMode) => void
  onSetStatusFilter: (statusFilter: ReaderStatusFilter) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  queryResetKey: string
  querySummary: ReaderArticleQuerySummary
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

  return article.summary ?? "No summary yet."
}

export function QueuePane({
  activeArticleId,
  activeSource,
  describedBy,
  headingId,
  onSearchTextChange,
  onSelectArticle,
  onSetSortMode,
  onSetStatusFilter,
  paneId,
  paneRef,
  queryResetKey,
  querySummary,
  searchText,
  sortMode,
  statusFilter,
  visibleArticles,
}: QueuePaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

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
          <p className="desktop-pane__eyebrow">Middle pane</p>
          <h2 id={headingId}>Article queue</h2>
          <p className="desktop-pane__focus-title">{activeSource.title}</p>
          <p className="desktop-pane__description">{activeSource.description}</p>
        </div>

        <div className="desktop-pane__toolbar">
          <TextInput
            aria-label="Article view filter"
            hint='This shell-owned filter now accepts shared-query text syntax such as tag:product, feed="FreelyRSS Engineering", or (tag:search OR has:attachment).'
            label="Queue filter"
            onChange={handleSearchTextChange}
            placeholder='Try tag:product OR "offline first"'
            value={searchText}
          />

          <fieldset className="desktop-toolbar-group">
            <legend className="desktop-toolbar-group__legend">View filter presets</legend>
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
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="desktop-toolbar-group">
            <legend className="desktop-toolbar-group__legend">Sort mode</legend>
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
                Sort: newest
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
                Sort: oldest
              </Button>
            </div>
          </fieldset>
        </div>

        <Surface className="desktop-view-state" compact>
          <div className="desktop-view-state__summary">
            <span className="desktop-summary__label">Article Query</span>
            <strong>{querySummary.summary}</strong>
          </div>
          <p className="desktop-view-state__note">{querySummary.sourceSummary}</p>
          {querySummary.queryMessage ? (
            <p
              className={
                querySummary.queryMessageTone === "error"
                  ? "desktop-query-message desktop-query-message--error"
                  : "desktop-query-message desktop-query-message--note"
              }
              role={querySummary.queryMessageTone === "error" ? "alert" : undefined}
            >
              {querySummary.queryMessage}
            </p>
          ) : null}
          <pre className="desktop-view-state__preview">{querySummary.jsonPreview}</pre>
        </Surface>

        <div className="desktop-pane__scroll desktop-pane__scroll--queue" ref={scrollRef}>
          {visibleArticles.length > 0 ? (
            <ListSection
              actions={
                <span className="desktop-queue__virtual-summary">
                  Rendering {virtualRows.length} of {visibleArticles.length} rows
                </span>
              }
              description={`${visibleArticles.length} placeholder article(s) visible for the current route-backed article query.`}
              title="Article queue"
            >
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
                        className="desktop-article-row"
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
            </ListSection>
          ) : (
            <div className="desktop-empty-state">
              <p className="desktop-empty-state__eyebrow">Empty queue</p>
              <h3>No placeholder articles are visible for this route yet.</h3>
              <p>
                The unified article query now evaluates to zero results for the current route and
                shell filters without leaving a stale article reference behind.
              </p>
            </div>
          )}
        </div>
      </Surface>
    </SplitPane>
  )
}
