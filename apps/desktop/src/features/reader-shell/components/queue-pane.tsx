import { useEffect, useRef } from "react"
import type { ChangeEvent, Ref } from "react"

import type { ArticleListItemDto, TagDto } from "@freelyrss/shared-types"
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
  ReaderBatchOperationCommand,
  ReaderBatchOperationResult,
  ReaderDensityMode,
  ReaderSortMode,
  ReaderStatusFilter,
  SourceRow,
} from "../types"
import { BatchOperationsCard } from "./batch-operations-card"

type QueuePaneProps = {
  activeArticleId: string | null
  activeSource: SourceRow
  availableBatchTags: TagDto[]
  batchOperationErrorMessage: string | null
  batchOperationResult: ReaderBatchOperationResult | null
  densityMode: ReaderDensityMode
  describedBy?: string
  headingId: string
  isRunningBatchOperation: boolean
  onClearBatchSelection: () => void
  onRunBatchOperation: (command: ReaderBatchOperationCommand) => void
  onSearchTextChange: (searchText: string) => void
  onSelectArticle: (articleId: string) => void
  onSelectAllVisibleBatchArticles: () => void
  onSetDensityMode: (mode: ReaderDensityMode) => void
  onSetSortMode: (sortMode: ReaderSortMode) => void
  onSetStatusFilter: (statusFilter: ReaderStatusFilter) => void
  onToggleBatchArticleSelection: (articleId: ArticleListItemDto["id"]) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  queryResetKey: string
  querySummary: ReaderArticleQuerySummary
  searchText: string
  selectedBatchArticleIds: ArticleListItemDto["id"][]
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
  availableBatchTags,
  batchOperationErrorMessage,
  batchOperationResult,
  densityMode,
  describedBy,
  headingId,
  isRunningBatchOperation,
  onClearBatchSelection,
  onRunBatchOperation,
  onSearchTextChange,
  onSelectArticle,
  onSelectAllVisibleBatchArticles,
  onSetDensityMode,
  onSetSortMode,
  onSetStatusFilter,
  onToggleBatchArticleSelection,
  paneId,
  paneRef,
  queryResetKey,
  querySummary,
  searchText,
  selectedBatchArticleIds,
  sortMode,
  statusFilter,
  visibleArticles,
}: QueuePaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const selectedBatchArticleIdSet = new Set(selectedBatchArticleIds)

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
          <h2 id={headingId}>Article queue</h2>
          <p className="desktop-pane__focus-title">{activeSource.title}</p>
        </div>

        <div className="desktop-pane__toolbar">
          <TextInput
            aria-label="Article view filter"
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
              Compact
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
              Comfortable
            </button>
          </div>
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

        <BatchOperationsCard
          availableTags={availableBatchTags}
          errorMessage={batchOperationErrorMessage}
          isRunning={isRunningBatchOperation}
          onClearSelection={onClearBatchSelection}
          onRunOperation={onRunBatchOperation}
          onSelectAllVisible={onSelectAllVisibleBatchArticles}
          result={batchOperationResult}
          selectedArticleCount={selectedBatchArticleIds.length}
          visibleArticleCount={visibleArticles.length}
        />

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
                      className={
                        selectedBatchArticleIdSet.has(article.id)
                          ? "desktop-virtual-list__item desktop-virtual-list__item--selected"
                          : "desktop-virtual-list__item"
                      }
                      data-virtual-index={virtualRow.index}
                      key={article.id}
                      style={{
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="desktop-article-row-shell">
                        <label className="desktop-queue__selection-control">
                          <input
                            aria-label={`Select ${article.title}`}
                            checked={selectedBatchArticleIdSet.has(article.id)}
                            className="desktop-queue__selection-checkbox"
                            onChange={() => onToggleBatchArticleSelection(article.id)}
                            type="checkbox"
                          />
                        </label>
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
