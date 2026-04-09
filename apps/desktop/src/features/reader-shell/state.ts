import { create } from "zustand"

import type { ReaderSortMode, ReaderStatusFilter } from "./types"

type ReaderViewStore = {
  searchText: string
  setSearchText: (searchText: string) => void
  setSortMode: (sortMode: ReaderSortMode) => void
  setStatusFilter: (statusFilter: ReaderStatusFilter) => void
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
}

export const useReaderViewStore = create<ReaderViewStore>((set) => ({
  searchText: "",
  setSearchText: (searchText) => set({ searchText }),
  setSortMode: (sortMode) => set({ sortMode }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  sortMode: "newest",
  statusFilter: "all",
}))
