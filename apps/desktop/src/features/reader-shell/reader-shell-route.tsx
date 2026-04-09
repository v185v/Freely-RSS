import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef } from "react"

import { Button, SplitLayout, Surface } from "@freelyrss/ui"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  READER_LANDMARK_IDS,
  READER_SHORTCUTS,
  READER_SHORTCUT_HINT_ID,
  type ReaderShortcutTarget,
  isEditableTarget,
} from "./accessibility"
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
  const themeTone = useReaderViewStore((state) => state.themeTone)
  const toggleThemeTone = useReaderViewStore((state) => state.toggleThemeTone)
  const deferredSearchText = useDeferredValue(searchText)
  const navigationRef = useRef<HTMLElement | null>(null)
  const sourcePaneRef = useRef<HTMLElement | null>(null)
  const queuePaneRef = useRef<HTMLElement | null>(null)
  const readerPaneRef = useRef<HTMLElement | null>(null)

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
          <p className="desktop-shell__eyebrow">Stage 2 / Step 17</p>
          <h1>Loading keyboard and accessibility scaffolding.</h1>
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
          <p className="desktop-shell__eyebrow">Stage 2 / Step 17</p>
          <h1>
            Keyboard entry points and landmark semantics now sit on top of the explicit shell
            layers.
          </h1>
          <p className="desktop-shell__lead">
            Route search params own the current source and selected article. A local shell store
            owns temporary queue filters and contrast mode. The current step adds global shortcuts,
            named regions, and a keyboard-first way to jump across the shell without collapsing the
            existing route, store, and query boundaries back together.
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
            describedBy={READER_SHORTCUT_HINT_ID}
            headingId={READER_LANDMARK_IDS.sourceHeading}
            onSelectSource={selectSource}
            paneId={READER_LANDMARK_IDS.source}
            paneRef={sourcePaneRef}
            sourceSections={resolvedShellData.sourceSections}
          />

          <QueuePane
            activeArticleId={activeArticleId}
            activeSource={activeSource}
            describedBy={READER_SHORTCUT_HINT_ID}
            filterSummary={filterSummary}
            headingId={READER_LANDMARK_IDS.queueHeading}
            onSearchTextChange={setSearchText}
            onSelectArticle={selectArticle}
            onSetSortMode={setSortMode}
            onSetStatusFilter={setStatusFilter}
            paneId={READER_LANDMARK_IDS.queue}
            paneRef={queuePaneRef}
            searchText={searchText}
            sortMode={sortMode}
            statusFilter={statusFilter}
            visibleArticles={visibleArticles}
          />

          <ReaderPane
            activeDetail={activeDetail}
            describedBy={READER_SHORTCUT_HINT_ID}
            headingId={READER_LANDMARK_IDS.readerHeading}
            paneId={READER_LANDMARK_IDS.reader}
            paneRef={readerPaneRef}
          />
        </SplitLayout>
      </div>
    </main>
  )
}
