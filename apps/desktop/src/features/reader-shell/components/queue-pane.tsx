import type { ChangeEvent, Ref } from "react"

import type { ArticleListItemDto } from "@freelyrss/shared-types"
import { Button, ListRow, ListSection, SplitPane, Surface, TextInput } from "@freelyrss/ui"

import { formatArticleMeta } from "../selectors"
import { READER_STATUS_FILTER_OPTIONS } from "../types"
import type {
  ReaderSortMode,
  ReaderStatusFilter,
  ReaderViewFilterSummary,
  SourceRow,
} from "../types"

type QueuePaneProps = {
  activeArticleId: string | null
  activeSource: SourceRow
  describedBy?: string
  filterSummary: ReaderViewFilterSummary
  headingId: string
  onSearchTextChange: (searchText: string) => void
  onSelectArticle: (articleId: string) => void
  onSetSortMode: (sortMode: ReaderSortMode) => void
  onSetStatusFilter: (statusFilter: ReaderStatusFilter) => void
  paneId: string
  paneRef?: Ref<HTMLElement>
  searchText: string
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
  visibleArticles: ArticleListItemDto[]
}

export function QueuePane({
  activeArticleId,
  activeSource,
  describedBy,
  filterSummary,
  headingId,
  onSearchTextChange,
  onSelectArticle,
  onSetSortMode,
  onSetStatusFilter,
  paneId,
  paneRef,
  searchText,
  sortMode,
  statusFilter,
  visibleArticles,
}: QueuePaneProps) {
  function handleSearchTextChange(event: ChangeEvent<HTMLInputElement>) {
    onSearchTextChange(event.target.value)
  }

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
            hint="This input lives in the shell store. Its AST preview is built with shared-query."
            label="Queue filter"
            onChange={handleSearchTextChange}
            placeholder="Filter within the current route"
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
            <span className="desktop-summary__label">View State</span>
            <strong>{filterSummary.summary}</strong>
          </div>
          {filterSummary.jsonPreview ? (
            <pre className="desktop-view-state__preview">{filterSummary.jsonPreview}</pre>
          ) : (
            <p className="desktop-view-state__note">
              No shared-query definition is needed until the shell store adds at least one filter
              clause.
            </p>
          )}
        </Surface>

        <div className="desktop-pane__scroll">
          {visibleArticles.length > 0 ? (
            <ListSection
              description={`${visibleArticles.length} placeholder article(s) visible for the current route and shell-owned view state.`}
              title="Article queue"
            >
              {visibleArticles.map((article) => (
                <ListRow
                  active={activeArticleId === article.id}
                  aria-current={activeArticleId === article.id ? "page" : undefined}
                  className="desktop-article-row"
                  eyebrow={article.feedTitle}
                  key={article.id}
                  meta={formatArticleMeta(article)}
                  onClick={() => onSelectArticle(article.id)}
                  summary={article.summary ?? "No summary yet."}
                  title={article.title}
                />
              ))}
            </ListSection>
          ) : (
            <div className="desktop-empty-state">
              <p className="desktop-empty-state__eyebrow">Empty queue</p>
              <h3>No placeholder articles are visible for this route yet.</h3>
              <p>
                This is the Step 16 fallback: the route can point at an empty source without leaving
                a stale article reference behind.
              </p>
            </div>
          )}
        </div>
      </Surface>
    </SplitPane>
  )
}
