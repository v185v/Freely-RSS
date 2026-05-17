import { create } from "zustand"

import type { ArticleListItemDto } from "@freelyrss/shared-types"

import type {
  ReaderBaseThemeTone,
  ReaderContentMode,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderMarginMode,
  ReaderSortMode,
  ReaderStatusFilter,
  ReaderThemeTone,
} from "./types"

const READER_CONTENT_MODE_STORAGE_KEY = "freelyrss.reader-content-mode"
const READER_PRESENTATION_SETTINGS_STORAGE_KEY = "freelyrss.reader-presentation-settings"
const READER_AI_ENABLED_STORAGE_KEY = "freelyrss.reader-ai-enabled"
const DEFAULT_READER_CONTENT_MODE: ReaderContentMode = "extracted"
const DEFAULT_THEME_TONE: ReaderThemeTone = "midnight"
const DEFAULT_BASE_THEME_TONE: ReaderBaseThemeTone = "midnight"
const DEFAULT_READER_FONT_FAMILY: ReaderFontFamily = "editorial"
const DEFAULT_READER_FONT_SCALE: ReaderFontScale = "comfortable"
const DEFAULT_READER_LINE_HEIGHT: ReaderLineHeight = "relaxed"
const DEFAULT_READER_MARGIN_MODE: ReaderMarginMode = "balanced"

function isReaderContentMode(value: string | null): value is ReaderContentMode {
  return value === "extracted" || value === "raw"
}

function isReaderThemeTone(value: unknown): value is ReaderThemeTone {
  return value === "daylight" || value === "high-contrast" || value === "midnight"
}

function isReaderBaseThemeTone(value: unknown): value is ReaderBaseThemeTone {
  return value === "daylight" || value === "midnight"
}

function isReaderFontFamily(value: unknown): value is ReaderFontFamily {
  return value === "editorial" || value === "sans" || value === "technical"
}

function isReaderFontScale(value: unknown): value is ReaderFontScale {
  return value === "compact" || value === "comfortable" || value === "large"
}

function isReaderLineHeight(value: unknown): value is ReaderLineHeight {
  return value === "tight" || value === "relaxed" || value === "airy"
}

function isReaderMarginMode(value: unknown): value is ReaderMarginMode {
  return value === "narrow" || value === "balanced" || value === "wide"
}

function readPersistedReaderContentMode() {
  if (typeof window === "undefined") {
    return DEFAULT_READER_CONTENT_MODE
  }

  try {
    const storedValue = window.localStorage.getItem(READER_CONTENT_MODE_STORAGE_KEY)
    return isReaderContentMode(storedValue) ? storedValue : DEFAULT_READER_CONTENT_MODE
  } catch {
    return DEFAULT_READER_CONTENT_MODE
  }
}

function writePersistedReaderContentMode(readerContentMode: ReaderContentMode) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(READER_CONTENT_MODE_STORAGE_KEY, readerContentMode)
  } catch {}
}

function clearPersistedReaderContentMode() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(READER_CONTENT_MODE_STORAGE_KEY)
  } catch {}
}

function readPersistedReaderAiEnabled() {
  if (typeof window === "undefined") {
    return false
  }

  try {
    return window.localStorage.getItem(READER_AI_ENABLED_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function writePersistedReaderAiEnabled(readerAiEnabled: boolean) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(READER_AI_ENABLED_STORAGE_KEY, String(readerAiEnabled))
  } catch {}
}

function clearPersistedReaderAiEnabled() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(READER_AI_ENABLED_STORAGE_KEY)
  } catch {}
}

type PersistedReaderPresentationSettings = {
  baseThemeTone: ReaderBaseThemeTone
  fontFamily: ReaderFontFamily
  fontScale: ReaderFontScale
  lineHeight: ReaderLineHeight
  marginMode: ReaderMarginMode
  themeTone: ReaderThemeTone
}

function readPersistedReaderPresentationSettings(): PersistedReaderPresentationSettings {
  if (typeof window === "undefined") {
    return {
      baseThemeTone: DEFAULT_BASE_THEME_TONE,
      fontFamily: DEFAULT_READER_FONT_FAMILY,
      fontScale: DEFAULT_READER_FONT_SCALE,
      lineHeight: DEFAULT_READER_LINE_HEIGHT,
      marginMode: DEFAULT_READER_MARGIN_MODE,
      themeTone: DEFAULT_THEME_TONE,
    }
  }

  try {
    const storedValue = window.localStorage.getItem(READER_PRESENTATION_SETTINGS_STORAGE_KEY)

    if (!storedValue) {
      throw new Error("Missing reader presentation settings")
    }

    const parsed = JSON.parse(storedValue) as Partial<
      Record<keyof PersistedReaderPresentationSettings, unknown>
    >
    const baseThemeTone = isReaderBaseThemeTone(parsed.baseThemeTone)
      ? parsed.baseThemeTone
      : DEFAULT_BASE_THEME_TONE
    const themeTone = isReaderThemeTone(parsed.themeTone) ? parsed.themeTone : DEFAULT_THEME_TONE

    return {
      baseThemeTone,
      fontFamily: isReaderFontFamily(parsed.fontFamily)
        ? parsed.fontFamily
        : DEFAULT_READER_FONT_FAMILY,
      fontScale: isReaderFontScale(parsed.fontScale) ? parsed.fontScale : DEFAULT_READER_FONT_SCALE,
      lineHeight: isReaderLineHeight(parsed.lineHeight)
        ? parsed.lineHeight
        : DEFAULT_READER_LINE_HEIGHT,
      marginMode: isReaderMarginMode(parsed.marginMode)
        ? parsed.marginMode
        : DEFAULT_READER_MARGIN_MODE,
      themeTone: themeTone === "high-contrast" ? "high-contrast" : baseThemeTone,
    }
  } catch {
    return {
      baseThemeTone: DEFAULT_BASE_THEME_TONE,
      fontFamily: DEFAULT_READER_FONT_FAMILY,
      fontScale: DEFAULT_READER_FONT_SCALE,
      lineHeight: DEFAULT_READER_LINE_HEIGHT,
      marginMode: DEFAULT_READER_MARGIN_MODE,
      themeTone: DEFAULT_THEME_TONE,
    }
  }
}

function writePersistedReaderPresentationSettings(settings: PersistedReaderPresentationSettings) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(READER_PRESENTATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}

function clearPersistedReaderPresentationSettings() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(READER_PRESENTATION_SETTINGS_STORAGE_KEY)
  } catch {}
}

type ReaderViewStore = {
  baseThemeTone: ReaderBaseThemeTone
  batchSelectedArticleIds: ArticleListItemDto["id"][]
  collapsedFolderIds: string[]
  clearBatchSelectedArticleIds: () => void
  pruneBatchSelectedArticleIds: (visibleArticleIds: ArticleListItemDto["id"][]) => void
  readerFontFamily: ReaderFontFamily
  readerFontScale: ReaderFontScale
  readerContentMode: ReaderContentMode
  readerLineHeight: ReaderLineHeight
  readerMarginMode: ReaderMarginMode
  readerAiEnabled: boolean
  searchText: string
  setReaderFontFamily: (readerFontFamily: ReaderFontFamily) => void
  setReaderFontScale: (readerFontScale: ReaderFontScale) => void
  setReaderContentMode: (readerContentMode: ReaderContentMode) => void
  setReaderLineHeight: (readerLineHeight: ReaderLineHeight) => void
  setReaderMarginMode: (readerMarginMode: ReaderMarginMode) => void
  setReaderAiEnabled: (readerAiEnabled: boolean) => void
  setSearchText: (searchText: string) => void
  setBatchSelectedArticleIds: (articleIds: ArticleListItemDto["id"][]) => void
  setCollapsedFolderIds: (folderIds: string[]) => void
  setSortMode: (sortMode: ReaderSortMode) => void
  setStatusFilter: (statusFilter: ReaderStatusFilter) => void
  setThemeTone: (themeTone: ReaderThemeTone) => void
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
  themeTone: ReaderThemeTone
  toggleBatchSelectedArticleId: (articleId: ArticleListItemDto["id"]) => void
  toggleFolderCollapsed: (folderId: string) => void
  toggleThemeTone: () => void
}

const readerViewDefaults = {
  baseThemeTone: DEFAULT_BASE_THEME_TONE,
  batchSelectedArticleIds: [] as ArticleListItemDto["id"][],
  collapsedFolderIds: [] as string[],
  readerFontFamily: DEFAULT_READER_FONT_FAMILY,
  readerFontScale: DEFAULT_READER_FONT_SCALE,
  readerContentMode: DEFAULT_READER_CONTENT_MODE,
  readerLineHeight: DEFAULT_READER_LINE_HEIGHT,
  readerMarginMode: DEFAULT_READER_MARGIN_MODE,
  readerAiEnabled: false,
  searchText: "",
  sortMode: "newest" as ReaderSortMode,
  statusFilter: "all" as ReaderStatusFilter,
  themeTone: DEFAULT_THEME_TONE,
}

function persistReaderPresentationSettings(state: {
  baseThemeTone: ReaderBaseThemeTone
  readerFontFamily: ReaderFontFamily
  readerFontScale: ReaderFontScale
  readerLineHeight: ReaderLineHeight
  readerMarginMode: ReaderMarginMode
  themeTone: ReaderThemeTone
}) {
  writePersistedReaderPresentationSettings({
    baseThemeTone: state.baseThemeTone,
    fontFamily: state.readerFontFamily,
    fontScale: state.readerFontScale,
    lineHeight: state.readerLineHeight,
    marginMode: state.readerMarginMode,
    themeTone: state.themeTone,
  })
}

function normalizeArticleIds(articleIds: ArticleListItemDto["id"][]) {
  return Array.from(new Set(articleIds))
}

function areArticleIdArraysEqual(
  left: ArticleListItemDto["id"][],
  right: ArticleListItemDto["id"][],
) {
  return (
    left.length === right.length && left.every((articleId, index) => articleId === right[index])
  )
}

const persistedPresentationSettings = readPersistedReaderPresentationSettings()
const persistedReaderAiEnabled = readPersistedReaderAiEnabled()

export const useReaderViewStore = create<ReaderViewStore>((set) => ({
  ...readerViewDefaults,
  baseThemeTone: persistedPresentationSettings.baseThemeTone,
  readerContentMode: readPersistedReaderContentMode(),
  readerFontFamily: persistedPresentationSettings.fontFamily,
  readerFontScale: persistedPresentationSettings.fontScale,
  readerLineHeight: persistedPresentationSettings.lineHeight,
  readerMarginMode: persistedPresentationSettings.marginMode,
  readerAiEnabled: persistedReaderAiEnabled,
  themeTone: persistedPresentationSettings.themeTone,
  setReaderContentMode: (readerContentMode) => {
    writePersistedReaderContentMode(readerContentMode)
    set({ readerContentMode })
  },
  setReaderFontFamily: (readerFontFamily) =>
    set((state) => {
      const nextState = { readerFontFamily }
      persistReaderPresentationSettings({
        ...state,
        ...nextState,
      })
      return nextState
    }),
  setReaderFontScale: (readerFontScale) =>
    set((state) => {
      const nextState = { readerFontScale }
      persistReaderPresentationSettings({
        ...state,
        ...nextState,
      })
      return nextState
    }),
  setReaderLineHeight: (readerLineHeight) =>
    set((state) => {
      const nextState = { readerLineHeight }
      persistReaderPresentationSettings({
        ...state,
        ...nextState,
      })
      return nextState
    }),
  setReaderMarginMode: (readerMarginMode) =>
    set((state) => {
      const nextState = { readerMarginMode }
      persistReaderPresentationSettings({
        ...state,
        ...nextState,
      })
      return nextState
    }),
  setReaderAiEnabled: (readerAiEnabled) => {
    writePersistedReaderAiEnabled(readerAiEnabled)
    set({ readerAiEnabled })
  },
  setSearchText: (searchText) => set({ searchText }),
  setBatchSelectedArticleIds: (articleIds) =>
    set({ batchSelectedArticleIds: normalizeArticleIds(articleIds) }),
  clearBatchSelectedArticleIds: () => set({ batchSelectedArticleIds: [] }),
  pruneBatchSelectedArticleIds: (visibleArticleIds) =>
    set((state) => {
      const visibleArticleIdSet = new Set(visibleArticleIds)
      const nextSelectedArticleIds = state.batchSelectedArticleIds.filter((articleId) =>
        visibleArticleIdSet.has(articleId),
      )

      return areArticleIdArraysEqual(state.batchSelectedArticleIds, nextSelectedArticleIds)
        ? state
        : { batchSelectedArticleIds: nextSelectedArticleIds }
    }),
  setCollapsedFolderIds: (collapsedFolderIds) => set({ collapsedFolderIds }),
  setSortMode: (sortMode) => set({ sortMode }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setThemeTone: (themeTone) =>
    set((state) => {
      const nextState =
        themeTone === "high-contrast"
          ? { themeTone }
          : {
              baseThemeTone: themeTone,
              themeTone,
            }

      persistReaderPresentationSettings({
        ...state,
        ...nextState,
      })

      return nextState
    }),
  toggleBatchSelectedArticleId: (articleId) =>
    set((state) => ({
      batchSelectedArticleIds: state.batchSelectedArticleIds.includes(articleId)
        ? state.batchSelectedArticleIds.filter((entry) => entry !== articleId)
        : [...state.batchSelectedArticleIds, articleId],
    })),
  toggleFolderCollapsed: (folderId) =>
    set((state) => ({
      collapsedFolderIds: state.collapsedFolderIds.includes(folderId)
        ? state.collapsedFolderIds.filter((entry) => entry !== folderId)
        : [...state.collapsedFolderIds, folderId],
    })),
  toggleThemeTone: () =>
    set((state) => {
      const nextState =
        state.themeTone === "high-contrast"
          ? { themeTone: state.baseThemeTone }
          : { themeTone: "high-contrast" as ReaderThemeTone }

      persistReaderPresentationSettings({
        ...state,
        ...nextState,
      })

      return nextState
    }),
}))

export function resetReaderViewStore(options?: {
  preservePersistedReaderAiEnabled?: boolean
  preservePersistedReaderContentMode?: boolean
  preservePersistedReaderPresentationSettings?: boolean
}) {
  if (!options?.preservePersistedReaderContentMode) {
    clearPersistedReaderContentMode()
  }

  if (!options?.preservePersistedReaderPresentationSettings) {
    clearPersistedReaderPresentationSettings()
  }

  if (!options?.preservePersistedReaderAiEnabled) {
    clearPersistedReaderAiEnabled()
  }

  const nextPresentationSettings = options?.preservePersistedReaderPresentationSettings
    ? readPersistedReaderPresentationSettings()
    : {
        baseThemeTone: DEFAULT_BASE_THEME_TONE,
        fontFamily: DEFAULT_READER_FONT_FAMILY,
        fontScale: DEFAULT_READER_FONT_SCALE,
        lineHeight: DEFAULT_READER_LINE_HEIGHT,
        marginMode: DEFAULT_READER_MARGIN_MODE,
        themeTone: DEFAULT_THEME_TONE,
      }

  useReaderViewStore.setState({
    ...readerViewDefaults,
    baseThemeTone: nextPresentationSettings.baseThemeTone,
    readerContentMode: options?.preservePersistedReaderContentMode
      ? readPersistedReaderContentMode()
      : DEFAULT_READER_CONTENT_MODE,
    readerFontFamily: nextPresentationSettings.fontFamily,
    readerFontScale: nextPresentationSettings.fontScale,
    readerLineHeight: nextPresentationSettings.lineHeight,
    readerMarginMode: nextPresentationSettings.marginMode,
    readerAiEnabled: options?.preservePersistedReaderAiEnabled
      ? readPersistedReaderAiEnabled()
      : false,
    themeTone: nextPresentationSettings.themeTone,
  })
}
