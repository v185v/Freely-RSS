import { create } from "zustand"

import type {
  ReaderContentMode,
  ReaderSortMode,
  ReaderStatusFilter,
  ReaderThemeTone,
} from "./types"

const READER_CONTENT_MODE_STORAGE_KEY = "freelyrss.reader-content-mode"
const DEFAULT_READER_CONTENT_MODE: ReaderContentMode = "extracted"

function isReaderContentMode(value: string | null): value is ReaderContentMode {
  return value === "extracted" || value === "raw"
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

type ReaderViewStore = {
  collapsedFolderIds: string[]
  readerContentMode: ReaderContentMode
  searchText: string
  setReaderContentMode: (readerContentMode: ReaderContentMode) => void
  setSearchText: (searchText: string) => void
  setCollapsedFolderIds: (folderIds: string[]) => void
  setSortMode: (sortMode: ReaderSortMode) => void
  setStatusFilter: (statusFilter: ReaderStatusFilter) => void
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
  themeTone: ReaderThemeTone
  toggleFolderCollapsed: (folderId: string) => void
  toggleThemeTone: () => void
}

const readerViewDefaults = {
  collapsedFolderIds: [] as string[],
  readerContentMode: DEFAULT_READER_CONTENT_MODE,
  searchText: "",
  sortMode: "newest" as ReaderSortMode,
  statusFilter: "all" as ReaderStatusFilter,
  themeTone: "midnight" as ReaderThemeTone,
}

export const useReaderViewStore = create<ReaderViewStore>((set) => ({
  ...readerViewDefaults,
  readerContentMode: readPersistedReaderContentMode(),
  setReaderContentMode: (readerContentMode) => {
    writePersistedReaderContentMode(readerContentMode)
    set({ readerContentMode })
  },
  setSearchText: (searchText) => set({ searchText }),
  setCollapsedFolderIds: (collapsedFolderIds) => set({ collapsedFolderIds }),
  setSortMode: (sortMode) => set({ sortMode }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  toggleFolderCollapsed: (folderId) =>
    set((state) => ({
      collapsedFolderIds: state.collapsedFolderIds.includes(folderId)
        ? state.collapsedFolderIds.filter((entry) => entry !== folderId)
        : [...state.collapsedFolderIds, folderId],
    })),
  toggleThemeTone: () =>
    set((state) => ({
      themeTone: state.themeTone === "midnight" ? "high-contrast" : "midnight",
    })),
}))

export function resetReaderViewStore(options?: {
  preservePersistedReaderContentMode?: boolean
}) {
  if (!options?.preservePersistedReaderContentMode) {
    clearPersistedReaderContentMode()
  }

  useReaderViewStore.setState({
    ...readerViewDefaults,
    readerContentMode: options?.preservePersistedReaderContentMode
      ? readPersistedReaderContentMode()
      : DEFAULT_READER_CONTENT_MODE,
  })
}
