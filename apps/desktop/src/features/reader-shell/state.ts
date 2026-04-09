import { create } from "zustand"

import type { ReaderSortMode, ReaderStatusFilter, ReaderThemeTone } from "./types"

type ReaderViewStore = {
  searchText: string
  setSearchText: (searchText: string) => void
  setSortMode: (sortMode: ReaderSortMode) => void
  setStatusFilter: (statusFilter: ReaderStatusFilter) => void
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
  themeTone: ReaderThemeTone
  toggleThemeTone: () => void
}

const readerViewDefaults = {
  searchText: "",
  sortMode: "newest" as ReaderSortMode,
  statusFilter: "all" as ReaderStatusFilter,
  themeTone: "midnight" as ReaderThemeTone,
}

export const useReaderViewStore = create<ReaderViewStore>((set) => ({
  ...readerViewDefaults,
  setSearchText: (searchText) => set({ searchText }),
  setSortMode: (sortMode) => set({ sortMode }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  toggleThemeTone: () =>
    set((state) => ({
      themeTone: state.themeTone === "midnight" ? "high-contrast" : "midnight",
    })),
}))

export function resetReaderViewStore() {
  useReaderViewStore.setState(readerViewDefaults)
}
