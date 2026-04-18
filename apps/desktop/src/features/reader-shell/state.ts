import { create } from "zustand"

import type { ReaderSortMode, ReaderStatusFilter, ReaderThemeTone } from "./types"

type ReaderViewStore = {
  collapsedFolderIds: string[]
  searchText: string
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
  searchText: "",
  sortMode: "newest" as ReaderSortMode,
  statusFilter: "all" as ReaderStatusFilter,
  themeTone: "midnight" as ReaderThemeTone,
}

export const useReaderViewStore = create<ReaderViewStore>((set) => ({
  ...readerViewDefaults,
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

export function resetReaderViewStore() {
  useReaderViewStore.setState(readerViewDefaults)
}
