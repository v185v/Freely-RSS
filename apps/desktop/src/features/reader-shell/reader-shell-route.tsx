import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { Surface } from "@freelyrss/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  READER_LANDMARK_IDS,
  READER_SHORTCUT_HINT_ID,
  type ReaderShortcutTarget,
  isEditableTarget,
} from "./accessibility"
import { buildReaderArticleQuery } from "./article-query"
import { AppToolbar } from "./components/app-toolbar"
import { QueuePane } from "./components/queue-pane"
import { ReaderPane } from "./components/reader-pane"
import { SettingsDropdown } from "./components/settings-dropdown"
import { SourcePane } from "./components/source-pane"
import { TaskStatusPanel } from "./components/task-status-panel"
import {
  answerDurableArticleQuestion,
  deleteDurableArticleAiCache,
  fetchDurableQueueArticles,
  generateDurableArticleInsights,
  generateDurableArticleTranslation,
} from "./desktop-bridge"
import {
  type MockBatchOperationResult,
  type MockDocumentExportResult,
  type MockMarkdownExportResult,
  type MockOpmlExportResult,
  type MockOpmlImportResult,
  answerMockArticleQuestion,
  createMockAnnotation,
  deleteMockArticleAiCache,
  exportMockDocument,
  exportMockMarkdown,
  exportMockOpml,
  fetchReaderShellData,
  generateMockArticleInsights,
  generateMockArticleTranslation,
  importMockOpml,
  readerShellQueryKey,
  refreshMockFeed,
  runMockBatchOperation,
  runMockCacheCleanup,
  updateMockArticleState,
  updateMockCacheSettings,
  updateMockFeed,
} from "./mock-data"
import {
  buildSubscriptionTreeRows,
  findSourceRow,
  resolveFeedIdsForSource,
  resolveSelectedArticleId,
} from "./selectors"
import { useReaderViewStore } from "./state"
import { buildReaderTaskStatuses, summarizeReaderTaskStatuses } from "./task-status"
import { DEFAULT_SOURCE_ID } from "./types"
import type {
  ReaderAIQuestionContextScope,
  ReaderAITranslationMode,
  ReaderRouteSearch,
  ReaderShellData,
  ReaderTaskStatusKind,
} from "./types"

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

function formatTaskBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${Math.round(value / (1024 * 1024))} MB`
}

export function ReaderShellRoute() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: "/" })
  const routeState = useSearch({ from: "/" })
  const searchText = useReaderViewStore((state) => state.searchText)
  const collapsedFolderIds = useReaderViewStore((state) => state.collapsedFolderIds)
  const setSearchText = useReaderViewStore((state) => state.setSearchText)
  const selectedBatchArticleIds = useReaderViewStore((state) => state.batchSelectedArticleIds)
  const clearBatchSelectedArticleIds = useReaderViewStore(
    (state) => state.clearBatchSelectedArticleIds,
  )
  const pruneBatchSelectedArticleIds = useReaderViewStore(
    (state) => state.pruneBatchSelectedArticleIds,
  )
  const setBatchSelectedArticleIds = useReaderViewStore((state) => state.setBatchSelectedArticleIds)
  const toggleBatchSelectedArticleId = useReaderViewStore(
    (state) => state.toggleBatchSelectedArticleId,
  )
  const setCollapsedFolderIds = useReaderViewStore((state) => state.setCollapsedFolderIds)
  const setSortMode = useReaderViewStore((state) => state.setSortMode)
  const sortMode = useReaderViewStore((state) => state.sortMode)
  const readerContentMode = useReaderViewStore((state) => state.readerContentMode)
  const setReaderContentMode = useReaderViewStore((state) => state.setReaderContentMode)
  const readerFontFamily = useReaderViewStore((state) => state.readerFontFamily)
  const setReaderFontFamily = useReaderViewStore((state) => state.setReaderFontFamily)
  const readerFontScale = useReaderViewStore((state) => state.readerFontScale)
  const setReaderFontScale = useReaderViewStore((state) => state.setReaderFontScale)
  const readerLineHeight = useReaderViewStore((state) => state.readerLineHeight)
  const setReaderLineHeight = useReaderViewStore((state) => state.setReaderLineHeight)
  const readerMarginMode = useReaderViewStore((state) => state.readerMarginMode)
  const setReaderMarginMode = useReaderViewStore((state) => state.setReaderMarginMode)
  const readerAiEnabled = useReaderViewStore((state) => state.readerAiEnabled)
  const setReaderAiEnabled = useReaderViewStore((state) => state.setReaderAiEnabled)
  const setStatusFilter = useReaderViewStore((state) => state.setStatusFilter)
  const statusFilter = useReaderViewStore((state) => state.statusFilter)
  const themeTone = useReaderViewStore((state) => state.themeTone)
  const setThemeTone = useReaderViewStore((state) => state.setThemeTone)
  const toggleFolderCollapsed = useReaderViewStore((state) => state.toggleFolderCollapsed)
  const toggleThemeTone = useReaderViewStore((state) => state.toggleThemeTone)
  const densityMode = useReaderViewStore((state) => state.densityMode)
  const setDensityMode = useReaderViewStore((state) => state.setDensityMode)
  const deferredSearchText = useDeferredValue(searchText)
  const [opmlImportReport, setOpmlImportReport] = useState<MockOpmlImportResult["report"] | null>(
    null,
  )
  const [opmlExportResult, setOpmlExportResult] = useState<MockOpmlExportResult | null>(null)
  const [markdownExportResult, setMarkdownExportResult] = useState<MockMarkdownExportResult | null>(
    null,
  )
  const [documentExportResult, setDocumentExportResult] = useState<MockDocumentExportResult | null>(
    null,
  )
  const [batchOperationResult, setBatchOperationResult] = useState<
    MockBatchOperationResult["batchResult"] | null
  >(null)
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
  const saveCacheSettingsMutation = useMutation({
    mutationFn: updateMockCacheSettings,
    onSuccess: (nextShellData) => {
      queryClient.setQueryData(readerShellQueryKey, nextShellData)
    },
  })
  const runCacheCleanupMutation = useMutation({
    mutationFn: runMockCacheCleanup,
    onSuccess: (nextShellData) => {
      queryClient.setQueryData(readerShellQueryKey, nextShellData)
    },
  })
  const updateArticleStateMutation = useMutation({
    mutationFn: updateMockArticleState,
    onSuccess: (nextShellData) => {
      queryClient.setQueryData(readerShellQueryKey, nextShellData)
    },
  })
  const runBatchOperationMutation = useMutation({
    mutationFn: runMockBatchOperation,
    onSuccess: (result) => {
      setBatchOperationResult(result.batchResult)
      queryClient.setQueryData(readerShellQueryKey, result.shellData)
    },
  })
  const createAnnotationMutation = useMutation({
    mutationFn: createMockAnnotation,
    onSuccess: (nextShellData) => {
      queryClient.setQueryData(readerShellQueryKey, nextShellData)
    },
  })
  const generateArticleInsightsMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const durableResult = await generateDurableArticleInsights(articleId)

      if (durableResult) {
        const currentData = queryClient.getQueryData<ReaderShellData>(readerShellQueryKey)
        const currentDetail = currentData?.articleDetails[articleId] ?? null

        if (!currentData || !currentDetail) {
          return {
            insightResult: durableResult,
            shellData: currentData ?? null,
          }
        }

        const replacedArtifactKinds = new Set(
          durableResult.artifacts.map((artifact) => artifact.kind),
        )
        const retainedArtifacts = currentDetail.aiArtifacts.filter(
          (artifact) => !replacedArtifactKinds.has(artifact.kind),
        )

        return {
          insightResult: durableResult,
          shellData: {
            ...currentData,
            articleDetails: {
              ...currentData.articleDetails,
              [articleId]: {
                ...currentDetail,
                aiArtifacts: [...durableResult.artifacts, ...retainedArtifacts],
              },
            },
          },
        }
      }

      return generateMockArticleInsights(articleId)
    },
    onSuccess: (result) => {
      if (result.shellData) {
        queryClient.setQueryData(readerShellQueryKey, result.shellData)
      }
    },
  })
  const generateArticleTranslationMutation = useMutation({
    mutationFn: async (input: {
      articleId: string
      mode: ReaderAITranslationMode
      selectedText?: string | null
      targetLanguage: string
    }) => {
      const durableResult = await generateDurableArticleTranslation(input)

      if (durableResult) {
        const currentData = queryClient.getQueryData<ReaderShellData>(readerShellQueryKey)
        const currentDetail = currentData?.articleDetails[input.articleId] ?? null

        if (!currentData || !currentDetail) {
          return {
            shellData: currentData ?? null,
            translationResult: durableResult,
          }
        }

        const retainedArtifacts = currentDetail.aiArtifacts.filter(
          (artifact) => artifact.id !== durableResult.artifact.id,
        )

        return {
          translationResult: durableResult,
          shellData: {
            ...currentData,
            articleDetails: {
              ...currentData.articleDetails,
              [input.articleId]: {
                ...currentDetail,
                aiArtifacts: [durableResult.artifact, ...retainedArtifacts],
              },
            },
          },
        }
      }

      return generateMockArticleTranslation(input)
    },
    onSuccess: (result) => {
      if (result.shellData) {
        queryClient.setQueryData(readerShellQueryKey, result.shellData)
      }
    },
  })
  const answerArticleQuestionMutation = useMutation({
    mutationFn: async (input: {
      articleId: string
      contextScope: ReaderAIQuestionContextScope
      question: string
    }) => {
      const request = {
        ...input,
        allowedArticleIds: visibleArticleIds,
        language: activeDetail?.article.language ?? null,
      }
      const durableResult = await answerDurableArticleQuestion(request)

      if (durableResult) {
        const currentData = queryClient.getQueryData<ReaderShellData>(readerShellQueryKey)
        const currentDetail = currentData?.articleDetails[input.articleId] ?? null

        if (!currentData || !currentDetail) {
          return {
            questionResult: durableResult,
            shellData: currentData ?? null,
          }
        }

        const retainedArtifacts = currentDetail.aiArtifacts.filter(
          (artifact) => artifact.id !== durableResult.artifact.id,
        )

        return {
          questionResult: durableResult,
          shellData: {
            ...currentData,
            articleDetails: {
              ...currentData.articleDetails,
              [input.articleId]: {
                ...currentDetail,
                aiArtifacts: [durableResult.artifact, ...retainedArtifacts],
              },
            },
          },
        }
      }

      return answerMockArticleQuestion(request)
    },
    onSuccess: (result) => {
      if (result.shellData) {
        queryClient.setQueryData(readerShellQueryKey, result.shellData)
      }
    },
  })
  const deleteArticleAiCacheMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const durableResult = await deleteDurableArticleAiCache(articleId)
      const currentData = queryClient.getQueryData<ReaderShellData>(readerShellQueryKey)
      const currentDetail = currentData?.articleDetails[articleId] ?? null

      if (durableResult && currentData && currentDetail) {
        return {
          cacheDeleteResult: durableResult,
          shellData: {
            ...currentData,
            articleDetails: {
              ...currentData.articleDetails,
              [articleId]: {
                ...currentDetail,
                aiArtifacts: [],
              },
            },
          },
        }
      }

      return deleteMockArticleAiCache(articleId)
    },
    onSuccess: (result) => {
      queryClient.setQueryData(readerShellQueryKey, result.shellData)
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
  const exportMarkdownMutation = useMutation({
    mutationFn: exportMockMarkdown,
    onSuccess: (result) => {
      setMarkdownExportResult(result)
    },
  })
  const exportDocumentMutation = useMutation({
    mutationFn: exportMockDocument,
    onSuccess: (result) => {
      setDocumentExportResult(result)
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

  const selectKeyboardArticle = useEffectEvent((articleId: string | null) => {
    if (!articleId || articleId === activeArticleId) {
      return
    }

    startTransition(() => {
      void navigate({
        to: "/",
        search: () => buildReaderSearch(routeState.sourceId, articleId),
      })
    })
  })

  const moveKeyboardSelection = useEffectEvent((offset: -1 | 1) => {
    if (visibleArticles.length === 0) {
      return
    }

    const currentIndex = activeArticleId
      ? visibleArticles.findIndex(
          (article: ReaderShellData["articles"][number]) => article.id === activeArticleId,
        )
      : -1
    const fallbackIndex = offset > 0 ? 0 : visibleArticles.length - 1
    const nextIndex =
      currentIndex === -1
        ? fallbackIndex
        : Math.max(0, Math.min(visibleArticles.length - 1, currentIndex + offset))
    const nextArticleId = visibleArticles[nextIndex]?.id ?? null

    selectKeyboardArticle(nextArticleId)
  })

  const updateArticleStateFromKeyboard = useEffectEvent(
    (
      input:
        | {
            readLater: boolean
          }
        | {
            readState: "read" | "unread"
          }
        | {
            starred: boolean
          },
    ) => {
      if (!activeDetail || updateArticleStateMutation.isPending) {
        return
      }

      updateArticleStateMutation.reset()
      updateArticleStateMutation.mutate({
        articleId: activeDetail.article.id,
        ...input,
      })
    },
  )

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
      const activeElement = document.activeElement
      const focusedCommandScope =
        activeElement === queuePaneRef.current
          ? "queue"
          : activeElement === readerPaneRef.current
            ? "reader"
            : null

      if (!focusedCommandScope) {
        return
      }

      const normalizedKey = event.key.length === 1 ? event.key.toLowerCase() : event.key

      switch (normalizedKey) {
        case "ArrowDown":
        case "j":
          event.preventDefault()
          moveKeyboardSelection(1)
          break
        case "ArrowUp":
        case "k":
          event.preventDefault()
          moveKeyboardSelection(-1)
          break
        case "Enter":
          if (focusedCommandScope === "queue") {
            event.preventDefault()
            focusShortcutTarget("reader")
          }
          break
        case "m":
          if (focusedCommandScope === "reader" && activeDetail) {
            event.preventDefault()
            updateArticleStateFromKeyboard({
              readState: activeDetail.state.readState === "read" ? "unread" : "read",
            })
          }
          break
        case "s":
          if (focusedCommandScope === "reader" && activeDetail) {
            event.preventDefault()
            updateArticleStateFromKeyboard({
              starred: !activeDetail.state.starred,
            })
          }
          break
        case "f":
          if (focusedCommandScope === "reader" && activeDetail) {
            event.preventDefault()
            updateArticleStateFromKeyboard({
              readLater: !activeDetail.state.readLater,
            })
          }
          break
        case "r":
          event.preventDefault()
          focusShortcutTarget("reader")
          break
        default:
          break
      }

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
  const subscriptionRows = shellData
    ? buildSubscriptionTreeRows(shellData, collapsedFolderIds, routeState.sourceId)
    : []
  const [durableVisibleArticles, setDurableVisibleArticles] = useState<
    ReaderShellData["articles"] | null
  >(null)

  useEffect(() => {
    let cancelled = false

    async function loadDurableQueue() {
      if (!shellData || !activeSource) {
        if (!cancelled) {
          setDurableVisibleArticles(null)
        }
        return
      }

      const durable = await fetchDurableQueueArticles(shellData, {
        feedIds: resolveFeedIdsForSource(shellData, activeSource.id),
        searchText: deferredSearchText,
        sortMode,
        statusFilter,
      })

      if (!cancelled) {
        setDurableVisibleArticles(durable?.items ?? null)
      }
    }

    void loadDurableQueue()

    return () => {
      cancelled = true
    }
  }, [activeSource, deferredSearchText, shellData, sortMode, statusFilter])

  const visibleArticles = durableVisibleArticles ?? articleQuery?.visibleArticles ?? []
  const visibleArticleIds = visibleArticles.map((article) => article.id)
  const visibleArticleIdsKey = visibleArticleIds.join("\u0000")
  const activeArticleId = shellData
    ? resolveSelectedArticleId(visibleArticles, routeState.articleId)
    : null
  const activeDetail =
    shellData && activeArticleId ? (shellData.articleDetails[activeArticleId] ?? null) : null
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
  const cacheSettingsErrorMessage =
    saveCacheSettingsMutation.error instanceof Error
      ? saveCacheSettingsMutation.error.message
      : null
  const cacheCleanupErrorMessage =
    runCacheCleanupMutation.error instanceof Error ? runCacheCleanupMutation.error.message : null
  const articleStateErrorMessage =
    updateArticleStateMutation.error instanceof Error
      ? updateArticleStateMutation.error.message
      : null
  const batchOperationErrorMessage =
    runBatchOperationMutation.error instanceof Error
      ? runBatchOperationMutation.error.message
      : null
  const annotationErrorMessage =
    createAnnotationMutation.error instanceof Error ? createAnnotationMutation.error.message : null
  const aiInsightErrorMessage =
    generateArticleInsightsMutation.error instanceof Error
      ? generateArticleInsightsMutation.error.message
      : null
  const aiTranslationErrorMessage =
    generateArticleTranslationMutation.error instanceof Error
      ? generateArticleTranslationMutation.error.message
      : null
  const aiQuestionErrorMessage =
    answerArticleQuestionMutation.error instanceof Error
      ? answerArticleQuestionMutation.error.message
      : null
  const markdownExportErrorMessage =
    exportMarkdownMutation.error instanceof Error ? exportMarkdownMutation.error.message : null
  const documentExportErrorMessage =
    exportDocumentMutation.error instanceof Error ? exportDocumentMutation.error.message : null

  useEffect(() => {
    if (shellData && activeArticleId !== routeState.articleId) {
      reconcileArticleSelection(activeArticleId)
    }
  }, [activeArticleId, reconcileArticleSelection, routeState.articleId, shellData])

  useEffect(() => {
    pruneBatchSelectedArticleIds(
      visibleArticleIdsKey.length > 0 ? visibleArticleIdsKey.split("\u0000") : [],
    )
  }, [pruneBatchSelectedArticleIds, visibleArticleIdsKey])

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalShortcut)

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcut)
    }
  }, [handleGlobalShortcut])

  if (shellDataQuery.isPending) {
    return <div className="desktop-loading">{t("app.loading")}</div>
  }

  if (shellDataQuery.isError) {
    return (
      <main className="desktop-shell">
        <Surface className="desktop-empty-state desktop-empty-state--reader">
          <p className="desktop-empty-state__eyebrow">{t("app.queryFailed")}</p>
          <h3>{t("app.queryFailedDetail")}</h3>
          <p>{shellDataQuery.error.message}</p>
        </Surface>
      </main>
    )
  }

  if (!shellData || !activeSource) {
    return null
  }

  const resolvedShellData = shellData
  const resolvedActiveSource = activeSource
  const resolvedArticleQuery =
    articleQuery ?? buildReaderArticleQuery(shellData, activeSource.id, filters)
  const highContrastEnabled = themeTone === "high-contrast"
  const latestCleanup = resolvedShellData.cacheStatus.latestCleanup
  const taskStatusEntries = buildReaderTaskStatuses([
    {
      id: "source-refresh",
      title: "Source refresh",
      scope: activeFeed ? activeFeed.title : activeSource.title,
      isRunning: refreshFeedMutation.isPending,
      error: refreshFeedMutation.error,
      completedDetail:
        refreshFeedMutation.isSuccess && activeFeed
          ? `${activeFeed.title} refreshed and source health is current.`
          : null,
      idleDetail: activeFeed
        ? "Ready to refresh the selected feed."
        : "Select a feed source before running a refresh.",
      runningDetail: activeFeed ? `Refreshing ${activeFeed.title}.` : "Refreshing selected source.",
      recovery:
        "Check the feed URL, keep intentionally empty feeds paused, or retry after the source responds.",
      retryLabel: activeFeed ? "Retry refresh" : null,
      updatedAt: activeFeed?.lastCheckedAt ?? null,
    },
    {
      id: "cache-cleanup",
      title: "Cache cleanup",
      scope: "Local cache",
      isRunning: runCacheCleanupMutation.isPending,
      error: runCacheCleanupMutation.error,
      completedDetail: latestCleanup
        ? `Freed ${formatTaskBytes(latestCleanup.evictedBytes)} across ${latestCleanup.evictedEntryCount} entries.`
        : null,
      idleDetail:
        resolvedShellData.cacheStatus.cleanupCandidates.length > 0
          ? "Cleanup candidates are available for the current cache budget."
          : "Cache cleanup is ready and no required eviction is pending.",
      runningDetail: "Applying the current cache cleanup plan.",
      recovery:
        "Retry cleanup after lowering the cache budget or review protected articles if space remains tight.",
      retryLabel: "Retry cleanup",
      updatedAt: latestCleanup?.completedAt ?? null,
    },
    {
      id: "ai-insights",
      title: "AI article insights",
      scope: activeDetail ? activeDetail.article.title : "No article selected",
      isRunning: generateArticleInsightsMutation.isPending,
      error: generateArticleInsightsMutation.error,
      completedDetail: generateArticleInsightsMutation.data?.insightResult
        ? `Generated ${generateArticleInsightsMutation.data.insightResult.artifacts.length} AI artifact(s).`
        : null,
      idleDetail: activeDetail
        ? "Ready to generate an explicit summary and keyword artifact for the selected article."
        : "Select an article before running AI insight generation.",
      runningDetail: activeDetail
        ? `Generating article insights for ${activeDetail.article.title}.`
        : "Generating article insights.",
      recovery: "Retry after selecting an article with extracted or raw content.",
      retryLabel: activeDetail ? "Retry AI insights" : null,
      updatedAt:
        generateArticleInsightsMutation.data?.insightResult.artifacts[0]?.createdAt ?? null,
    },
    {
      id: "ai-translation",
      title: "AI translation",
      scope: activeDetail ? activeDetail.article.title : "No article selected",
      isRunning: generateArticleTranslationMutation.isPending,
      error: generateArticleTranslationMutation.error,
      completedDetail: generateArticleTranslationMutation.data?.translationResult
        ? `Generated ${generateArticleTranslationMutation.data.translationResult.artifact.kind} artifact.`
        : null,
      idleDetail: activeDetail
        ? "Ready to translate the selected article or selected reader text."
        : "Select an article before running AI translation.",
      runningDetail: activeDetail
        ? `Translating article text for ${activeDetail.article.title}.`
        : "Translating article text.",
      recovery: "Select an article or extracted text, then retry translation.",
      retryLabel: activeDetail ? "Retry AI translation" : null,
      updatedAt:
        generateArticleTranslationMutation.data?.translationResult.artifact.createdAt ?? null,
    },
    {
      id: "ai-question",
      title: "AI question answering",
      scope: activeDetail ? activeDetail.article.title : "No article selected",
      isRunning: answerArticleQuestionMutation.isPending,
      error: answerArticleQuestionMutation.error,
      completedDetail: answerArticleQuestionMutation.data?.questionResult
        ? `Answered with ${answerArticleQuestionMutation.data.questionResult.citedContextIds.length} allowed context item(s).`
        : null,
      idleDetail: activeDetail
        ? "Ready to answer a question using an explicitly selected context scope."
        : "Select an article before asking an AI question.",
      runningDetail: activeDetail
        ? `Answering within the selected context for ${activeDetail.article.title}.`
        : "Answering within the selected context.",
      recovery: "Keep an article selected and choose an allowed context scope before retrying.",
      retryLabel: activeDetail ? "Retry AI question" : null,
      updatedAt: answerArticleQuestionMutation.data?.questionResult.artifact.createdAt ?? null,
    },
    {
      id: "ai-cache",
      title: "AI cache",
      scope: activeDetail ? activeDetail.article.title : "No article selected",
      isRunning: deleteArticleAiCacheMutation.isPending,
      error: deleteArticleAiCacheMutation.error,
      completedDetail: deleteArticleAiCacheMutation.data?.cacheDeleteResult
        ? `Deleted ${deleteArticleAiCacheMutation.data.cacheDeleteResult.deletedArtifactCount} AI artifact(s).`
        : null,
      idleDetail: activeDetail
        ? "AI cache can be deleted for the selected article without disabling core reading."
        : "Select an article before deleting AI cache.",
      runningDetail: activeDetail
        ? `Deleting AI artifacts for ${activeDetail.article.title}.`
        : "Deleting AI artifacts.",
      recovery: "Retry after selecting an article with stored AI artifacts.",
      retryLabel: activeDetail ? "Retry AI cache delete" : null,
      updatedAt: null,
    },
    {
      id: "markdown-export",
      title: "Markdown export",
      scope: "Reader export",
      isRunning: exportMarkdownMutation.isPending,
      error: exportMarkdownMutation.error,
      completedDetail: markdownExportResult
        ? `Generated ${markdownExportResult.fileName} for ${markdownExportResult.report.exportedArticleCount} article(s).`
        : null,
      idleDetail: "Ready to generate Markdown from the selected article or visible queue.",
      runningDetail: "Generating Markdown export payload.",
      recovery: "Select an article or switch to a non-empty queue before retrying Markdown export.",
      retryLabel: activeDetail || visibleArticles.length > 0 ? "Retry Markdown export" : null,
      updatedAt: markdownExportResult?.report.generatedAt ?? null,
    },
    {
      id: "document-export",
      title: "HTML/PDF export",
      scope: "Reader export",
      isRunning: exportDocumentMutation.isPending,
      error: exportDocumentMutation.error,
      completedDetail: documentExportResult
        ? `Generated ${documentExportResult.fileName} as ${documentExportResult.report.format.toUpperCase()} output.`
        : null,
      idleDetail: "Ready to prepare HTML or PDF print-source output from the reader.",
      runningDetail: "Preparing document export source.",
      recovery: "Keep a readable article selected or use a non-empty queue before retrying.",
      retryLabel: activeDetail || visibleArticles.length > 0 ? "Retry HTML export" : null,
      updatedAt: documentExportResult?.report.generatedAt ?? null,
    },
    {
      id: "batch-operation",
      title: "Batch operation",
      scope: "Visible queue",
      isRunning: runBatchOperationMutation.isPending,
      error: runBatchOperationMutation.error,
      completedDetail: batchOperationResult
        ? `Changed ${batchOperationResult.report.changedArticleCount} selected article(s).`
        : null,
      idleDetail: "Select visible articles before running a batch command.",
      runningDetail: "Applying the selected queue batch operation.",
      recovery: "Select at least one visible queue row, then retry the batch command.",
      retryLabel: null,
      updatedAt: batchOperationResult?.report.completedAt ?? null,
    },
    {
      id: "opml-import",
      title: "OPML import",
      scope: "Subscriptions",
      isRunning: importOpmlMutation.isPending,
      error: importOpmlMutation.error,
      completedDetail: opmlImportReport
        ? `Imported ${opmlImportReport.createdFeedCount} feed(s), created ${opmlImportReport.createdFolderCount} folder(s), and skipped ${opmlImportReport.duplicateFeedCount} duplicate(s).`
        : null,
      idleDetail: "Ready to import an OPML subscription payload.",
      runningDetail: "Importing OPML subscription payload.",
      recovery: "Check that the OPML payload has feed outline nodes with xmlUrl attributes.",
      retryLabel: null,
    },
    {
      id: "opml-export",
      title: "OPML export",
      scope: "Subscriptions",
      isRunning: exportOpmlMutation.isPending,
      error: exportOpmlMutation.error,
      completedDetail: opmlExportResult
        ? `Generated OPML for ${opmlExportResult.report.exportedFeedCount} feed(s).`
        : null,
      idleDetail: "Ready to generate an OPML copy of the subscription tree.",
      runningDetail: "Generating OPML subscription export.",
      recovery: "Retry after subscription tree data reloads.",
      retryLabel: "Retry OPML export",
      updatedAt: opmlExportResult?.report.generatedAt ?? null,
    },
  ])
  const taskStatusSummary = summarizeReaderTaskStatuses(taskStatusEntries)

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

  function retryTask(taskId: ReaderTaskStatusKind) {
    switch (taskId) {
      case "source-refresh":
        if (activeFeed) {
          refreshFeedMutation.reset()
          refreshFeedMutation.mutate(activeFeed.id)
        }
        break
      case "cache-cleanup":
        runCacheCleanupMutation.reset()
        runCacheCleanupMutation.mutate()
        break
      case "markdown-export":
        exportMarkdownMutation.reset()
        setMarkdownExportResult(null)
        if (activeDetail) {
          exportMarkdownMutation.mutate({
            articleIds: [activeDetail.article.id],
            mode: "single",
          })
        } else if (visibleArticles.length > 0) {
          exportMarkdownMutation.mutate({
            articleIds: visibleArticles.map((article) => article.id),
            mode: "batch",
            title: `${resolvedActiveSource.title} Markdown export`,
          })
        }
        break
      case "document-export":
        exportDocumentMutation.reset()
        setDocumentExportResult(null)
        if (activeDetail) {
          exportDocumentMutation.mutate({
            articleIds: [activeDetail.article.id],
            format: "html",
            mode: "single",
            presentation: {
              contentMode: readerContentMode,
              fontFamily: readerFontFamily,
              fontScale: readerFontScale,
              lineHeight: readerLineHeight,
              marginMode: readerMarginMode,
              themeTone,
            },
          })
        } else if (visibleArticles.length > 0) {
          exportDocumentMutation.mutate({
            articleIds: visibleArticles.map((article) => article.id),
            format: "html",
            mode: "batch",
            presentation: {
              contentMode: readerContentMode,
              fontFamily: readerFontFamily,
              fontScale: readerFontScale,
              lineHeight: readerLineHeight,
              marginMode: readerMarginMode,
              themeTone,
            },
            title: `${resolvedActiveSource.title} HTML export`,
          })
        }
        break
      case "ai-insights":
        generateArticleInsightsMutation.reset()
        if (activeDetail && readerAiEnabled) {
          generateArticleInsightsMutation.mutate(activeDetail.article.id)
        }
        break
      case "ai-translation":
        generateArticleTranslationMutation.reset()
        if (activeDetail && readerAiEnabled) {
          generateArticleTranslationMutation.mutate({
            articleId: activeDetail.article.id,
            mode: "fullArticle",
            targetLanguage: "zh-Hans",
          })
        }
        break
      case "ai-question":
        answerArticleQuestionMutation.reset()
        if (activeDetail && readerAiEnabled) {
          answerArticleQuestionMutation.mutate({
            articleId: activeDetail.article.id,
            contextScope: "currentArticle",
            question: "What is the main point of this article?",
          })
        }
        break
      case "ai-cache":
        deleteArticleAiCacheMutation.reset()
        if (activeDetail) {
          deleteArticleAiCacheMutation.mutate(activeDetail.article.id)
        }
        break
      case "opml-export":
        exportOpmlMutation.reset()
        exportOpmlMutation.mutate()
        break
      case "batch-operation":
      case "opml-import":
        break
    }
  }

  return (
    <main className="desktop-shell">
      <nav aria-label={t("skipLinks.label")} className="desktop-skip-links">
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.navigation}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("navigation")
          }}
        >
          {t("skipLinks.navigation")}
        </a>
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.source}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("source")
          }}
        >
          {t("skipLinks.sources")}
        </a>
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.queue}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("queue")
          }}
        >
          {t("skipLinks.queue")}
        </a>
        <a
          className="desktop-skip-link"
          href={`#${READER_LANDMARK_IDS.reader}`}
          onClick={(event) => {
            event.preventDefault()
            focusTarget("reader")
          }}
        >
          {t("skipLinks.reader")}
        </a>
      </nav>

      <p className="desktop-sr-only" id={READER_SHORTCUT_HINT_ID}>
        Keyboard shortcuts: Alt+1 focuses primary navigation, Alt+2 focuses sources, Alt+3 focuses
        the article queue, Alt+4 focuses the reading panel, Alt+Shift+H toggles the high contrast
        theme while preserving the current daylight or midnight preference, J or ArrowDown moves to
        the next visible article when the queue or reader is focused, K or ArrowUp moves to the
        previous visible article, Enter opens the current article into the reading panel from the
        queue, M toggles read and unread state, S toggles starred, F toggles read later, and R
        focuses the reading panel.
      </p>

      <AppToolbar
        onSearchChange={setSearchText}
        searchValue={searchText}
        settingsSlot={
          <SettingsDropdown
            densityMode={densityMode}
            highContrastEnabled={highContrastEnabled}
            onOpenCacheSettings={() => {}}
            onOpenOpmlExport={() => {}}
            onOpenOpmlImport={() => {}}
            onOpenSyncSettings={() => {}}
            onSetDensityMode={setDensityMode}
            onSetThemeTone={setThemeTone}
            onToggleThemeTone={toggleThemeTone}
            themeTone={themeTone}
          />
        }
      />

      <div className="desktop-columns">
        <SourcePane
          activeSourceId={routeState.sourceId}
          canCollapseFolders={subscriptionRows.some(
            (row) => row.kind === "folder" && !row.isCollapsed,
          )}
          describedBy={READER_SHORTCUT_HINT_ID}
          headingId={READER_LANDMARK_IDS.sourceHeading}
          onCollapseAllFolders={() => setCollapsedFolderIds(collapsibleFolderIds)}
          onSelectSource={selectSource}
          onToggleFolderCollapsed={toggleFolderCollapsed}
          paneId={READER_LANDMARK_IDS.source}
          paneRef={sourcePaneRef}
          quickViewSection={resolvedShellData.quickViewSection}
          smartFolderSection={{
            title: t("source.smartFolders"),
            rows: resolvedShellData.smartFolders.map((folder) => ({
              id: folder.id,
              kind: "view",
              title: folder.name,
              meta: `${folder.unreadCount}/${folder.articleCount}`,
            })),
          }}
          subscriptionRows={subscriptionRows}
        />

        <QueuePane
          activeArticleId={activeArticleId}
          activeSource={activeSource}
          availableBatchTags={resolvedShellData.tags}
          batchOperationErrorMessage={batchOperationErrorMessage}
          batchOperationResult={batchOperationResult}
          densityMode={densityMode}
          describedBy={READER_SHORTCUT_HINT_ID}
          headingId={READER_LANDMARK_IDS.queueHeading}
          isRunningBatchOperation={runBatchOperationMutation.isPending}
          onClearBatchSelection={clearBatchSelectedArticleIds}
          onRunBatchOperation={(command) => {
            runBatchOperationMutation.reset()
            setBatchOperationResult(null)
            runBatchOperationMutation.mutate({
              ...command,
              articleIds: selectedBatchArticleIds,
            })
          }}
          onSearchTextChange={setSearchText}
          onSelectArticle={selectArticle}
          onSelectAllVisibleBatchArticles={() => setBatchSelectedArticleIds(visibleArticleIds)}
          onSetDensityMode={setDensityMode}
          onSetSortMode={setSortMode}
          onSetStatusFilter={setStatusFilter}
          onToggleBatchArticleSelection={toggleBatchSelectedArticleId}
          paneId={READER_LANDMARK_IDS.queue}
          paneRef={queuePaneRef}
          queryResetKey={resolvedArticleQuery.summary.jsonPreview}
          querySummary={resolvedArticleQuery.summary}
          searchText={searchText}
          selectedBatchArticleIds={selectedBatchArticleIds}
          sortMode={sortMode}
          statusFilter={statusFilter}
          visibleArticles={visibleArticles}
        />

        <ReaderPane
          activeDetail={activeDetail}
          annotationErrorMessage={annotationErrorMessage}
          aiInsightErrorMessage={aiInsightErrorMessage}
          aiQuestionErrorMessage={aiQuestionErrorMessage}
          aiTranslationErrorMessage={aiTranslationErrorMessage}
          articleStateErrorMessage={articleStateErrorMessage}
          describedBy={READER_SHORTCUT_HINT_ID}
          documentExportErrorMessage={documentExportErrorMessage}
          documentExportResult={documentExportResult}
          headingId={READER_LANDMARK_IDS.readerHeading}
          isCreatingAnnotation={createAnnotationMutation.isPending}
          isGeneratingAIInsights={generateArticleInsightsMutation.isPending}
          isAnsweringAIQuestion={answerArticleQuestionMutation.isPending}
          isDeletingAICache={deleteArticleAiCacheMutation.isPending}
          isExportingDocument={exportDocumentMutation.isPending}
          isExportingMarkdown={exportMarkdownMutation.isPending}
          isGeneratingAITranslation={generateArticleTranslationMutation.isPending}
          isReaderAIEnabled={readerAiEnabled}
          isUpdatingArticleState={updateArticleStateMutation.isPending}
          markdownExportErrorMessage={markdownExportErrorMessage}
          markdownExportResult={markdownExportResult}
          onCreateAnnotation={(input) => {
            createAnnotationMutation.reset()
            createAnnotationMutation.mutate(input)
          }}
          onGenerateAIInsights={() => {
            if (!activeDetail || !readerAiEnabled) {
              return
            }

            generateArticleInsightsMutation.reset()
            generateArticleInsightsMutation.mutate(activeDetail.article.id)
          }}
          onAnswerAIQuestion={(input) => {
            if (!activeDetail || !readerAiEnabled) {
              return
            }

            answerArticleQuestionMutation.reset()
            answerArticleQuestionMutation.mutate({
              articleId: activeDetail.article.id,
              contextScope: input.contextScope,
              question: input.question,
            })
          }}
          onGenerateAITranslation={(input) => {
            if (!activeDetail || !readerAiEnabled) {
              return
            }

            generateArticleTranslationMutation.reset()
            generateArticleTranslationMutation.mutate({
              articleId: activeDetail.article.id,
              mode: input.mode,
              selectedText: input.selectedText,
              targetLanguage: input.targetLanguage,
            })
          }}
          onDeleteAICache={() => {
            if (!activeDetail) {
              return
            }

            deleteArticleAiCacheMutation.reset()
            deleteArticleAiCacheMutation.mutate(activeDetail.article.id)
          }}
          onExportDocumentBatch={(format) => {
            exportDocumentMutation.reset()
            setDocumentExportResult(null)
            exportDocumentMutation.mutate({
              articleIds: visibleArticles.map((article) => article.id),
              format,
              mode: "batch",
              presentation: {
                contentMode: readerContentMode,
                fontFamily: readerFontFamily,
                fontScale: readerFontScale,
                lineHeight: readerLineHeight,
                marginMode: readerMarginMode,
                themeTone,
              },
              title: `${activeSource.title} ${format.toUpperCase()} export`,
            })
          }}
          onExportDocumentSingle={(format) => {
            if (!activeDetail) {
              return
            }

            exportDocumentMutation.reset()
            setDocumentExportResult(null)
            exportDocumentMutation.mutate({
              articleIds: [activeDetail.article.id],
              format,
              mode: "single",
              presentation: {
                contentMode: readerContentMode,
                fontFamily: readerFontFamily,
                fontScale: readerFontScale,
                lineHeight: readerLineHeight,
                marginMode: readerMarginMode,
                themeTone,
              },
            })
          }}
          onExportMarkdownBatch={() => {
            exportMarkdownMutation.reset()
            setMarkdownExportResult(null)
            exportMarkdownMutation.mutate({
              articleIds: visibleArticles.map((article) => article.id),
              mode: "batch",
              title: `${activeSource.title} Markdown export`,
            })
          }}
          onExportMarkdownSingle={() => {
            if (!activeDetail) {
              return
            }

            exportMarkdownMutation.reset()
            setMarkdownExportResult(null)
            exportMarkdownMutation.mutate({
              articleIds: [activeDetail.article.id],
              mode: "single",
            })
          }}
          onSetReaderContentMode={setReaderContentMode}
          onSetReaderFontFamily={setReaderFontFamily}
          onSetReaderFontScale={setReaderFontScale}
          onSetReaderLineHeight={setReaderLineHeight}
          onSetReaderMarginMode={setReaderMarginMode}
          onSetReaderAIEnabled={setReaderAiEnabled}
          onSetThemeTone={setThemeTone}
          onUpdateArticleState={(input) => {
            updateArticleStateMutation.reset()
            updateArticleStateMutation.mutate(input)
          }}
          paneId={READER_LANDMARK_IDS.reader}
          paneRef={readerPaneRef}
          readerContentMode={readerContentMode}
          readerFontFamily={readerFontFamily}
          readerFontScale={readerFontScale}
          readerLineHeight={readerLineHeight}
          readerMarginMode={readerMarginMode}
          searchHighlightTerms={resolvedArticleQuery.searchHighlightTerms}
          themeTone={themeTone}
          visibleArticleCount={visibleArticles.length}
        />
      </div>
    </main>
  )
}
