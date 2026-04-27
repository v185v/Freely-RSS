import type { ArticleDetailDto, ArticleListItemDto, FeedDto } from "@freelyrss/shared-types"

import type {
  ReaderCacheCleanupCandidate,
  ReaderCacheCleanupReason,
  ReaderCacheCleanupReport,
  ReaderCacheEntryKind,
  ReaderCacheSettings,
  ReaderCacheStatus,
} from "./types"

type ReaderCacheProtectionReason = "note" | "readLater" | "starred"

export interface ReaderCacheInventoryEntry {
  articleId: ArticleListItemDto["id"]
  attachmentId: ArticleDetailDto["attachments"][number]["id"] | null
  bytes: number
  feedId: FeedDto["id"]
  id: string
  kind: ReaderCacheEntryKind
  lastAccessedAt: string
  path: string
}

type ReaderCachePlanningInput = {
  articleDetails: Record<string, ArticleDetailDto>
  articles: ArticleListItemDto[]
  cacheSettings: ReaderCacheSettings
  entries: ReaderCacheInventoryEntry[]
  feedDetails: FeedDto[]
}

type PlannedCacheEntry = {
  attachmentId: ReaderCacheInventoryEntry["attachmentId"]
  candidate: ReaderCacheCleanupCandidate
  entryId: ReaderCacheInventoryEntry["id"]
  lastAccessedAt: string
  policyMismatch: boolean
  protectedFromLru: boolean
}

export interface ReaderCacheCleanupPlan {
  evictedEntries: Array<{
    attachmentId: ReaderCacheInventoryEntry["attachmentId"]
    id: ReaderCacheInventoryEntry["id"]
  }>
  report: ReaderCacheCleanupReport
}

function normalizeBytes(value: number) {
  return Math.max(0, Math.round(value))
}

function compareByLastAccessedAt(
  left: { lastAccessedAt: string },
  right: { lastAccessedAt: string },
) {
  const leftTime = Date.parse(left.lastAccessedAt)
  const rightTime = Date.parse(right.lastAccessedAt)

  return (Number.isNaN(leftTime) ? 0 : leftTime) - (Number.isNaN(rightTime) ? 0 : rightTime)
}

function hasAnnotationNote(detail: ArticleDetailDto | undefined) {
  if (!detail) {
    return false
  }

  return detail.annotations.some(
    (annotation) => annotation.type === "note" || (annotation.note?.trim().length ?? 0) > 0,
  )
}

function resolveProtectionReasons(
  article: ArticleListItemDto | undefined,
  detail: ArticleDetailDto | undefined,
): ReaderCacheProtectionReason[] {
  if (!article) {
    return []
  }

  const reasons: ReaderCacheProtectionReason[] = []

  if (article.state.starred) {
    reasons.push("starred")
  }

  if (article.state.readLater) {
    reasons.push("readLater")
  }

  if (hasAnnotationNote(detail)) {
    reasons.push("note")
  }

  return reasons
}

function isEntryAllowedByPolicy(policy: FeedDto["cachePolicy"], kind: ReaderCacheEntryKind) {
  switch (policy) {
    case "metadata-only":
      return false
    case "content":
      return kind === "content"
    case "content-and-attachments":
      return true
  }
}

function buildPlannedEntries(input: ReaderCachePlanningInput): PlannedCacheEntry[] {
  const articlesById = new Map(input.articles.map((article) => [article.id, article]))
  const feedsById = new Map(input.feedDetails.map((feed) => [feed.id, feed]))

  return input.entries
    .map((entry) => {
      const article = articlesById.get(entry.articleId)
      const detail = input.articleDetails[entry.articleId]
      const feed = feedsById.get(entry.feedId)
      const protectionReasons = resolveProtectionReasons(article, detail)
      const policyMismatch = !isEntryAllowedByPolicy(feed?.cachePolicy ?? "content", entry.kind)
      const reason: ReaderCacheCleanupReason = policyMismatch ? "policy-mismatch" : "lru"

      return {
        attachmentId: entry.attachmentId,
        candidate: {
          articleId: entry.articleId,
          articleTitle: article?.title ?? entry.articleId,
          bytes: normalizeBytes(entry.bytes),
          kind: entry.kind,
          path: entry.path,
          reason,
        },
        entryId: entry.id,
        lastAccessedAt: entry.lastAccessedAt,
        policyMismatch,
        protectedFromLru: !policyMismatch && protectionReasons.length > 0,
      }
    })
    .sort((left, right) => {
      if (left.policyMismatch !== right.policyMismatch) {
        return left.policyMismatch ? -1 : 1
      }

      if (left.protectedFromLru !== right.protectedFromLru) {
        return left.protectedFromLru ? 1 : -1
      }

      return compareByLastAccessedAt(left, right)
    })
}

function buildCandidateEntries(plannedEntries: PlannedCacheEntry[]) {
  return plannedEntries.filter((entry) => entry.policyMismatch || !entry.protectedFromLru)
}

export function summarizeReaderCache(input: ReaderCachePlanningInput): ReaderCacheStatus {
  const plannedEntries = buildPlannedEntries(input)
  const candidateEntries = buildCandidateEntries(plannedEntries)
  const totalBytes = input.entries.reduce((sum, entry) => sum + normalizeBytes(entry.bytes), 0)
  const limitBytes = normalizeBytes(input.cacheSettings.maxBytes)
  const policyMismatchBytes = plannedEntries.reduce(
    (sum, entry) => sum + (entry.policyMismatch ? entry.candidate.bytes : 0),
    0,
  )
  const protectedEntries = plannedEntries.filter((entry) => entry.protectedFromLru)
  const protectedBytes = protectedEntries.reduce((sum, entry) => sum + entry.candidate.bytes, 0)
  const protectedArticleCount = new Set(protectedEntries.map((entry) => entry.candidate.articleId))
    .size

  return {
    cleanupCandidates: candidateEntries.map((entry) => entry.candidate),
    entryCount: input.entries.length,
    evictableBytes: candidateEntries.reduce((sum, entry) => sum + entry.candidate.bytes, 0),
    latestCleanup: null,
    limitBytes,
    overBudgetBytes: Math.max(0, totalBytes - limitBytes),
    policyMismatchBytes,
    protectedArticleCount,
    protectedBytes,
    totalBytes,
  }
}

export function planReaderCacheCleanup(
  input: ReaderCachePlanningInput,
  completedAt = new Date().toISOString(),
): ReaderCacheCleanupPlan {
  const plannedEntries = buildPlannedEntries(input)
  const candidateEntries = buildCandidateEntries(plannedEntries)
  const limitBytes = normalizeBytes(input.cacheSettings.maxBytes)
  const totalBytes = input.entries.reduce((sum, entry) => sum + normalizeBytes(entry.bytes), 0)
  const protectedArticleCount = new Set(
    plannedEntries
      .filter((entry) => entry.protectedFromLru)
      .map((entry) => entry.candidate.articleId),
  ).size
  let remainingBytes = totalBytes
  const evictedEntries: ReaderCacheCleanupPlan["evictedEntries"] = []
  let lruEntryCount = 0
  let policyMismatchEntryCount = 0
  for (const entry of candidateEntries.filter((candidate) => candidate.policyMismatch)) {
    remainingBytes -= entry.candidate.bytes
    policyMismatchEntryCount += 1
    evictedEntries.push({
      attachmentId: entry.attachmentId,
      id: entry.entryId,
    })
  }

  if (remainingBytes > limitBytes) {
    for (const entry of candidateEntries.filter((candidate) => !candidate.policyMismatch)) {
      remainingBytes -= entry.candidate.bytes
      lruEntryCount += 1
      evictedEntries.push({
        attachmentId: entry.attachmentId,
        id: entry.entryId,
      })

      if (remainingBytes <= limitBytes) {
        break
      }
    }
  }

  const report: ReaderCacheCleanupReport = {
    completedAt,
    evictedBytes: Math.max(0, totalBytes - remainingBytes),
    evictedEntryCount: evictedEntries.length,
    lruEntryCount,
    policyMismatchEntryCount,
    protectedArticleCount,
    remainingBytes: Math.max(0, remainingBytes),
    stillOverBudgetBytes: Math.max(0, remainingBytes - limitBytes),
  }

  return {
    evictedEntries,
    report,
  }
}
