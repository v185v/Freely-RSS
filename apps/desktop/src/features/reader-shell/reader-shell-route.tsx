import { startTransition, useDeferredValue, useEffect, useEffectEvent } from "react"

import { SplitLayout, Surface } from "@freelyrss/ui"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { NavigationStrip } from "./components/navigation-strip"
import { QueuePane } from "./components/queue-pane"
import { ReaderPane } from "./components/reader-pane"
import { SourcePane } from "./components/source-pane"
import { fetchReaderShellData } from "./mock-data"
import {
  buildViewFilterSummary,
  findSourceRow,
  getVisibleArticles,
  resolveSelectedArticleId,
} from "./selectors"
import { useReaderViewStore } from "./state"
import { DEFAULT_SOURCE_ID } from "./types"
import type { ReaderRouteSearch } from "./types"

export function validateReaderSearch(search: Record<string, unknown>): ReaderRouteSearch {
  return {
    articleId:
      typeof search.articleId === "string" && search.articleId.length > 0 ? search.articleId : null,
    sourceId:
      typeof search.sourceId === "string" && search.sourceId.length > 0
        ? search.sourceId
        : DEFAULT_SOURCE_ID,
  }
}

function buildReaderSearch(sourceId: string, articleId: string | null) {
  if (articleId) {
    return {
      sourceId,
      articleId,
    }
  }

  return {
    sourceId,
  }
}

export function ReaderShellRoute() {
  const navigate = useNavigate({ from: "/" })
  const routeState = useSearch({ from: "/" })
  const searchText = useReaderViewStore((state) => state.searchText)
  const setSearchText = useReaderViewStore((state) => state.setSearchText)
  const setSortMode = useReaderViewStore((state) => state.setSortMode)
  const sortMode = useReaderViewStore((state) => state.sortMode)
  const setStatusFilter = useReaderViewStore((state) => state.setStatusFilter)
  const statusFilter = useReaderViewStore((state) => state.statusFilter)
  const deferredSearchText = useDeferredValue(searchText)

  const shellDataQuery = useQuery({
    queryKey: ["desktop-reader-shell", "mock-data"],
    queryFn: fetchReaderShellData,
  })

  const reconcileArticleSelection = useEffectEvent((articleId: string | null) => {
    startTransition(() => {
      void navigate({
        to: "/",
        replace: true,
        search: () => buildReaderSearch(routeState.sourceId, articleId),
      })
    })
  })

  const shellData = shellDataQuery.data ?? null
  const filters = {
    searchText: deferredSearchText,
    sortMode,
    statusFilter,
  }
  const activeSource = shellData ? findSourceRow(shellData, routeState.sourceId) : null
  const visibleArticles =
    shellData && activeSource ? getVisibleArticles(shellData, activeSource.id, filters) : []
  const activeArticleId = shellData
    ? resolveSelectedArticleId(visibleArticles, routeState.articleId)
    : null
  const activeDetail =
    shellData && activeArticleId ? (shellData.articleDetails[activeArticleId] ?? null) : null
  const filterSummary = buildViewFilterSummary(filters)

  useEffect(() => {
    if (shellData && activeArticleId !== routeState.articleId) {
      reconcileArticleSelection(activeArticleId)
    }
  }, [activeArticleId, reconcileArticleSelection, routeState.articleId, shellData])

  if (shellDataQuery.isPending) {
    return (
      <main className="desktop-shell">
        <div className="desktop-loading">
          <p className="desktop-shell__eyebrow">Stage 2 / Step 16</p>
          <h1>Loading navigation and view state scaffolding.</h1>
        </div>
      </main>
    )
  }

  if (shellDataQuery.isError) {
    return (
      <main className="desktop-shell">
        <Surface className="desktop-empty-state desktop-empty-state--reader">
          <p className="desktop-empty-state__eyebrow">Query failed</p>
          <h3>Mock reader shell data could not be loaded.</h3>
          <p>{shellDataQuery.error.message}</p>
        </Surface>
      </main>
    )
  }

  if (!shellData || !activeSource) {
    return null
  }

  const resolvedShellData = shellData

  function selectSource(sourceId: string) {
    startTransition(() => {
      void navigate({
        to: "/",
        search: () => buildReaderSearch(sourceId, null),
      })
    })
  }

  function selectArticle(articleId: string) {
    startTransition(() => {
      void navigate({
        to: "/",
        search: () => buildReaderSearch(routeState.sourceId, articleId),
      })
    })
  }

  return (
    <main className="desktop-shell">
      <header className="desktop-shell__header">
        <div className="desktop-shell__title-block">
          <p className="desktop-shell__eyebrow">Stage 2 / Step 16</p>
          <h1>
            Navigation, view state, and async mock data are now explicit desktop-shell layers.
          </h1>
          <p className="desktop-shell__lead">
            Route search params own the current source and selected article. A local shell store
            owns temporary queue filters. TanStack Query loads mock reader data asynchronously so
            later persistence work has a stable composition boundary to target.
          </p>
        </div>

        <Surface className="desktop-summary" compact>
          <div className="desktop-summary__metrics">
            <div>
              <span className="desktop-summary__label">Sources</span>
              <strong>{resolvedShellData.stats.feedCount}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Visible</span>
              <strong>{visibleArticles.length}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Reading</span>
              <strong>{resolvedShellData.stats.readingCount}</strong>
            </div>
          </div>

          <div className="desktop-route-state">
            <div>
              <span className="desktop-summary__label">Route Source</span>
              <strong>{routeState.sourceId}</strong>
            </div>
            <div>
              <span className="desktop-summary__label">Selected Article</span>
              <strong>{activeArticleId ?? "none"}</strong>
            </div>
          </div>

          <p className="desktop-summary__note">
            Empty routes now resolve to a valid reader state instead of leaving stale article ids in
            place.
          </p>
        </Surface>
      </header>

      <NavigationStrip
        activeSourceId={routeState.sourceId}
        entries={resolvedShellData.navigationEntries}
        onSelectSource={selectSource}
      />

      <div className="desktop-workspace">
        <SplitLayout>
          <SourcePane
            activeSourceId={routeState.sourceId}
            onSelectSource={selectSource}
            sourceSections={resolvedShellData.sourceSections}
          />

          <QueuePane
            activeArticleId={activeArticleId}
            activeSource={activeSource}
            filterSummary={filterSummary}
            onSearchTextChange={setSearchText}
            onSelectArticle={selectArticle}
            onSetSortMode={setSortMode}
            onSetStatusFilter={setStatusFilter}
            searchText={searchText}
            sortMode={sortMode}
            statusFilter={statusFilter}
            visibleArticles={visibleArticles}
          />

          <ReaderPane activeDetail={activeDetail} />
        </SplitLayout>
      </div>
    </main>
  )
}
