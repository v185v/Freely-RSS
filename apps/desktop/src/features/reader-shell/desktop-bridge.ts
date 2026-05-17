import type { ArticleListItemDto } from "@freelyrss/shared-types"

import type {
  ReaderAICacheDeleteResult,
  ReaderAIInsightResult,
  ReaderAIQuestionContextScope,
  ReaderAIQuestionResult,
  ReaderAITranslationMode,
  ReaderAITranslationResult,
  ReaderShellData,
  ReaderSortMode,
  ReaderStatusFilter,
} from "./types"

type DurableQueueRequest = {
  feedIds: string[]
  searchText: string
  sortMode: ReaderSortMode
  statusFilter: ReaderStatusFilter
}

export async function deleteDurableArticleAiCache(
  articleId: string,
): Promise<ReaderAICacheDeleteResult | null> {
  const invoke = await resolveInvoke()

  if (!invoke) {
    return null
  }

  try {
    return await invoke<ReaderAICacheDeleteResult>("delete_article_ai_cache", {
      request: {
        articleId,
      },
    })
  } catch {
    return null
  }
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

export async function generateDurableArticleInsights(
  articleId: string,
): Promise<ReaderAIInsightResult | null> {
  const invoke = await resolveInvoke()

  if (!invoke) {
    return null
  }

  try {
    return await invoke<ReaderAIInsightResult>("generate_article_insights", {
      request: {
        articleId,
        maxSummaryChars: 520,
        maxKeywords: 8,
      },
    })
  } catch {
    return null
  }
}

export async function generateDurableArticleTranslation(input: {
  articleId: string
  mode: ReaderAITranslationMode
  selectedText?: string | null
  targetLanguage: string
}): Promise<ReaderAITranslationResult | null> {
  const invoke = await resolveInvoke()

  if (!invoke) {
    return null
  }

  try {
    return await invoke<ReaderAITranslationResult>("generate_article_translation", {
      request: input,
    })
  } catch {
    return null
  }
}

export async function answerDurableArticleQuestion(input: {
  allowedArticleIds: string[]
  articleId: string
  contextScope: ReaderAIQuestionContextScope
  language?: string | null
  question: string
}): Promise<ReaderAIQuestionResult | null> {
  const invoke = await resolveInvoke()

  if (!invoke) {
    return null
  }

  try {
    return await invoke<ReaderAIQuestionResult>("answer_article_question", {
      request: input,
    })
  } catch {
    return null
  }
}
