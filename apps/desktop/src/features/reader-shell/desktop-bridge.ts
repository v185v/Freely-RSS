import type { ArticleListItemDto } from "@freelyrss/shared-types"

import type { ReaderShellData, ReaderSortMode, ReaderStatusFilter } from "./types"

type DurableQueueRequest = {
  feedIds: string[]
  searchText: string
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
}

type DurableQueueResponse = {
  executionMode: "durable"
  items: ArticleListItemDto[]
}

async function resolveInvoke() {
  try {
    const tauriCore = await import("@tauri-apps/api/core")
    return tauriCore.invoke
  } catch {
    return null
  }
}

export async function fetchDurableQueueArticles(
  _shellData: ReaderShellData,
  request: DurableQueueRequest,
): Promise<DurableQueueResponse | null> {
  const invoke = await resolveInvoke()

  if (!invoke) {
    return null
  }

  try {
    const items = await invoke<ArticleListItemDto[]>("load_reader_queue_articles", {
      request,
    })

    return {
      executionMode: "durable",
      items,
    }
  } catch {
    return null
  }
}
