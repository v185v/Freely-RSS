import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"

import { Button, SplitLayout, Surface } from "@freelyrss/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  READER_LANDMARK_IDS,
  READER_SHORTCUTS,
  READER_SHORTCUT_HINT_ID,
  type ReaderShortcutTarget,
  isEditableTarget,
} from "./accessibility"
import { buildReaderArticleQuery } from "./article-query"
import { NavigationStrip } from "./components/navigation-strip"
import { QueuePane } from "./components/queue-pane"
import { ReaderPane } from "./components/reader-pane"
import { SourcePane } from "./components/source-pane"
import {
  type MockOpmlExportResult,
  type MockOpmlImportResult,
  exportMockOpml,
  fetchReaderShellData,
  importMockOpml,
  readerShellQueryKey,
  refreshMockFeed,
  updateMockFeed,
} from "./mock-data"
import { buildSubscriptionTreeRows, findSourceRow, resolveSelectedArticleId } from "./selectors"
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
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: "/" })
  const routeState = useSearch({ from: "/" })
  const searchText = useReaderViewStore((state) => state.searchText)
  const collapsedFolderIds = useReaderViewStore((state) => state.collapsedFolderIds)
  const setSearchText = useReaderViewStore((state) => state.setSearchText)
  const setCollapsedFolderIds = useReaderViewStore((state) => state.setCollapsedFolderIds)
  const setSortMode = useReaderViewStore((state) => state.setSortMode)
  const sortMode = useReaderViewStore((state) => state.sortMode)
  const readerContentMode = useReaderViewStore((state) => state.readerContentMode)
  const setReaderContentMode = useReaderViewStore((state) => state.setReaderContentMode)
  const setStatusFilter = useReaderViewStore((state) => state.setStatusFilter)
  const statusFilter = useReaderViewStore((state) => state.statusFilter)
  const themeTone = useReaderViewStore((state) => state.themeTone)
  const toggleFolderCollapsed = useReaderViewStore((state) => state.toggleFolderCollapsed)
  const toggleThemeTone = useReaderViewStore((state) => state.toggleThemeTone)
  const deferredSearchText = useDeferredValue(searchText)
  const [opmlImportReport, setOpmlImportReport] = useState<MockOpmlImportResult["report"] | null>(
    null,
  )
  const [opmlExportResult, setOpmlExportResult] = useState<MockOpmlExportResult | null>(null)
  const navigationRef = useRef<HTMLElement | null>(null)
  const sourcePaneRef = useRef<HTMLElement | null>(null)
  const queuePaneRef = useRef<HTMLElement | null>(null)
  const readerPaneRef = useRef<HTMLElement | null>(null)

  const shellDataQuery = useQuery({
    queryKey: readerShellQueryKey,
    queryFn: fetchReaderShellData,
  })
  const saveFeedMutation = useMutation({
    mutationFn: updateMockFeed,
    onSuccess: (nextShellData) => {
      queryClient.setQueryData(readerShellQueryKey, nextShellData)
    },
  })
  const refreshFeedMutation = useMutation({
    mutationFn: refreshMockFeed,
    onSuccess: (nextShellData) => {
      queryClient.setQueryData(readerShellQueryKey, nextShellData)
    },
  })
  const importOpmlMutation = useMutation({
    mutationFn: importMockOpml,
    onSuccess: (result) => {
      setOpmlImportReport(result.report)
      setOpmlExportResult(null)
      queryClient.setQueryData(readerShellQueryKey, result.shellData)
    },
  })
  const exportOpmlMutation = useMutation({
    mutationFn: exportMockOpml,
    onSuccess: (result) => {
      setOpmlExportResult(result)
    },
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

  const focusShortcutTarget = useEffectEvent((target: Exclude<ReaderShortcutTarget, "theme">) => {
    const element =
      target === "navigation"
        ? navigationRef.current
        : target === "source"
          ? sourcePaneRef.current
          : target === "queue"
            ? queuePaneRef.current
            : readerPaneRef.current

    element?.focus()
  })

  const handleGlobalShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      isEditableTarget(event.target)
    ) {
      return
    }

    if (event.altKey && event.shiftKey && event.key.toLowerCase() === "h") {
      event.preventDefault()
      toggleThemeTone()
      return
    }

    if (!event.altKey || event.shiftKey) {
      return
    }

    switch (event.key) {
      case "1":
        event.preventDefault()
        focusShortcutTarget("navigation")
        break
      case "2":
        event.preventDefault()
        focusShortcutTarget("source")
        break
      case "3":
        event.preventDefault()
        focusShortcutTarget("queue")
        break
      case "4":
        event.preventDefault()
        focusShortcutTarget("reader")
        break
      default:
        break
    }
  })

  const shellData = shellDataQuery.data ?? null
  const filters = {
    searchText: deferredSearchText,
    sortMode,
    statusFilter,
  }
  const activeSource = shellData ? findSourceRow(shellData, routeState.sourceId) : null
  const articleQuery =
    shellData && activeSource ? buildReaderArticleQuery(shellData, activeSource.id, filters) : null
  const visibleArticles = articleQuery?.visibleArticles ?? []
  const activeArticleId = shellData
    ? resolveSelectedArticleId(visibleArticles, routeState.articleId)
    : null
  const activeDetail =
    shellData && activeArticleId ? (shellData.articleDetails[activeArticleId] ?? null) : null
  const subscriptionRows = shellData
    ? buildSubscriptionTreeRows(shellData, collapsedFolderIds, routeState.sourceId)
    : []
  const activeFeed =
    shellData && routeState.sourceId in shellData.feedDetails
      ? (shellData.feedDetails[routeState.sourceId] ?? null)
      : null
  const collapsibleFolderIds = subscriptionRows
    .filter((row) => row.kind === "folder" && row.hasChildren)
    .map((row) => row.id)
  const editorErrorMessage =
    (saveFeedMutation.error instanceof Error ? saveFeedMutation.error.message : null) ??
    (refreshFeedMutation.error instanceof Error ? refreshFeedMutation.error.message : null)

  useEffect(() => {
    if (shellData && activeArticleId !== routeState.articleId) {
      reconcileArticleSelection(activeArticleId)
    }
  }, [activeArticleId, reconcileArticleSelection, routeState.articleId, shellData])

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalShortcut)

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcut)
    }
  }, [handleGlobalShortcut])

  if (shellDataQuery.isPending) {
    return (
      <main className="desktop-shell">
        <div className="desktop-loading">
          <p className="desktop-shell__eyebrow">Stage 5 / Step 42</p>
          <h1>Loading the route-backed reader shell and attachment-aware article detail view.</h1>
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
  const resolvedArticleQuery =
    articleQuery ?? buildReaderArticleQuery(shellData, activeSource.id, filters)
  const highContrastEnabled = themeTone === "high-contrast"

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

  function focusTarget(target: Exclude<ReaderShortcutTarget, "theme">) {
    focusShortcutTarget(target)
  }

  return (
    <main className="desktop-shell">
      <nav aria-label="Skip links" className="desktop-skip-links">
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.navigation}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("navigation")
          }}
        >
          Skip to primary navigation
        </a>
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.source}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("source")
          }}
        >
          Skip to sources
        </a>
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.queue}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("queue")
          }}
        >
          Skip to article queue
        </a>
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.reader}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("reader")
          }}
        >
          Skip to reading panel
        </a>
      </nav>

      <p className="desktop-sr-only" id={READER_SHORTCUT_HINT_ID}>
        Keyboard shortcuts: Alt+1 focuses primary navigation, Alt+2 focuses sources, Alt+3 focuses
        the article queue, Alt+4 focuses the reading panel, and Alt+Shift+H toggles high contrast
        mode.
      </p>

      <header className="desktop-shell__header">
        <div className="desktop-shell__title-block">
          <p className="desktop-shell__eyebrow">Stage 5 / Step 42</p>
          <h1>The desktop shell now surfaces attachments and podcast enclosures in the reader.</h1>
          <p className="desktop-shell__lead">
            Route state still owns the active source and article, the shell store still owns only
            local queue controls, folder expansion, and the persisted reader content-mode
            preference, and the mock repository remains a shell-side snapshot source. Step 42 keeps
            the Step 37 query boundary, Step 38 virtualization boundary, Step 39 reading-panel
            boundary, and Step 40 content-mode boundary intact, then makes article attachments
            visible without pulling enclosure parsing or persistence up into the shell.
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
            The queue still consumes one route-backed article query while source editing, OPML
            portability, and tree expansion remain separate concerns. Step 42 keeps reader-mode
            preference behavior intact while adding attachment visibility on the right without
            changing query vocabulary or storage boundaries.
          </p>

          <div className="desktop-shortcuts">
            <div className="desktop-shortcuts__summary">
              <span className="desktop-summary__label">Accessibility</span>
              <strong>Keyboard landmarks and contrast mode are now shell-level concerns.</strong>
            </div>

            <ul className="desktop-shortcuts__list">
              {READER_SHORTCUTS.map((shortcut) => (
                <li className="desktop-shortcuts__item" key={shortcut.key}>
                  <span>{shortcut.key}</span>
                  <span>{shortcut.description}</span>
                </li>
              ))}
            </ul>

            <Button
              aria-describedby={READER_SHORTCUT_HINT_ID}
              aria-keyshortcuts="Alt+Shift+H"
              aria-pressed={highContrastEnabled}
              className={
                highContrastEnabled
                  ? "desktop-shortcuts__toggle desktop-shortcuts__toggle--active"
                  : "desktop-shortcuts__toggle"
              }
              onClick={toggleThemeTone}
              size="sm"
              tone={highContrastEnabled ? "neutral" : "ghost"}
            >
              High contrast: {highContrastEnabled ? "on" : "off"}
            </Button>
          </div>
        </Surface>
      </header>

      <NavigationStrip
        activeSourceId={routeState.sourceId}
        describedBy={READER_SHORTCUT_HINT_ID}
        entries={resolvedShellData.navigationEntries}
        navigationId={READER_LANDMARK_IDS.navigation}
        navigationRef={navigationRef}
        onSelectSource={selectSource}
      />

      <div className="desktop-workspace">
        <SplitLayout>
          <SourcePane
            activeSourceId={routeState.sourceId}
            activeFeed={activeFeed}
            canCollapseFolders={subscriptionRows.some(
              (row) => row.kind === "folder" && !row.isCollapsed,
            )}
            describedBy={READER_SHORTCUT_HINT_ID}
            editorErrorMessage={editorErrorMessage}
            exportErrorMessage={
              exportOpmlMutation.error instanceof Error ? exportOpmlMutation.error.message : null
            }
            exportReport={opmlExportResult?.report ?? null}
            exportedOpml={opmlExportResult?.opmlText ?? null}
            headingId={READER_LANDMARK_IDS.sourceHeading}
            importErrorMessage={
              importOpmlMutation.error instanceof Error ? importOpmlMutation.error.message : null
            }
            importReport={opmlImportReport}
            isExportingOpml={exportOpmlMutation.isPending}
            isImportingOpml={importOpmlMutation.isPending}
            isRefreshingFeed={refreshFeedMutation.isPending}
            isSavingFeed={saveFeedMutation.isPending}
            onCollapseAllFolders={() => setCollapsedFolderIds(collapsibleFolderIds)}
            onExportOpml={() => {
              exportOpmlMutation.reset()
              exportOpmlMutation.mutate()
            }}
            onImportOpml={(opmlText) => {
              exportOpmlMutation.reset()
              setOpmlExportResult(null)
              importOpmlMutation.reset()
              setOpmlImportReport(null)
              importOpmlMutation.mutate(opmlText)
            }}
            onRefreshFeed={(feedId) => {
              exportOpmlMutation.reset()
              setOpmlExportResult(null)
              importOpmlMutation.reset()
              refreshFeedMutation.reset()
              saveFeedMutation.reset()
              refreshFeedMutation.mutate(feedId)
            }}
            onSelectSource={selectSource}
            onSaveFeed={(input) => {
              exportOpmlMutation.reset()
              setOpmlExportResult(null)
              importOpmlMutation.reset()
              refreshFeedMutation.reset()
              saveFeedMutation.reset()
              saveFeedMutation.mutate(input)
            }}
            onToggleFolderCollapsed={toggleFolderCollapsed}
            paneId={READER_LANDMARK_IDS.source}
            paneRef={sourcePaneRef}
            quickViewSection={resolvedShellData.quickViewSection}
            subscriptionRows={subscriptionRows}
          />

          <QueuePane
            activeArticleId={activeArticleId}
            activeSource={activeSource}
            describedBy={READER_SHORTCUT_HINT_ID}
            headingId={READER_LANDMARK_IDS.queueHeading}
            onSearchTextChange={setSearchText}
            onSelectArticle={selectArticle}
            onSetSortMode={setSortMode}
            onSetStatusFilter={setStatusFilter}
            paneId={READER_LANDMARK_IDS.queue}
            paneRef={queuePaneRef}
            queryResetKey={resolvedArticleQuery.summary.jsonPreview}
            querySummary={resolvedArticleQuery.summary}
            searchText={searchText}
            sortMode={sortMode}
            statusFilter={statusFilter}
            visibleArticles={visibleArticles}
          />

          <ReaderPane
            activeDetail={activeDetail}
            describedBy={READER_SHORTCUT_HINT_ID}
            headingId={READER_LANDMARK_IDS.readerHeading}
            onSetReaderContentMode={setReaderContentMode}
            paneId={READER_LANDMARK_IDS.reader}
            paneRef={readerPaneRef}
            readerContentMode={readerContentMode}
          />
        </SplitLayout>
      </div>
    </main>
  )
}
