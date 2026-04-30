import { describe, expect, test } from "vitest"

import { buildReaderTaskStatuses, summarizeReaderTaskStatuses } from "./task-status"

describe("reader task status boundary", () => {
  test("prioritizes running, failed, completed, and idle task states", () => {
    const entries = buildReaderTaskStatuses([
      {
        id: "source-refresh",
        title: "Source refresh",
        scope: "Feed",
        isRunning: true,
        error: new Error("Previous error should be hidden while retrying."),
        completedDetail: "Feed refreshed.",
        idleDetail: "Ready to refresh the selected feed.",
        runningDetail: "Refreshing selected feed.",
        recovery: "Retry after checking the source URL.",
        retryLabel: "Retry refresh",
      },
      {
        id: "markdown-export",
        title: "Markdown export",
        scope: "Export",
        isRunning: false,
        error: new Error("Markdown export requires at least one article."),
        idleDetail: "Ready to export Markdown.",
        recovery: "Select an article or switch to a non-empty queue.",
        retryLabel: "Retry Markdown export",
      },
      {
        id: "cache-cleanup",
        title: "Cache cleanup",
        scope: "Cache",
        isRunning: false,
        completedDetail: "Freed 428 MB across 2 entries.",
        idleDetail: "Ready to run cleanup.",
        recovery: "Adjust the cache budget before retrying.",
        updatedAt: "2026-04-30T12:00:00.000Z",
      },
      {
        id: "batch-operation",
        title: "Batch operation",
        scope: "Queue",
        isRunning: false,
        idleDetail: "Select visible articles before running a batch command.",
        recovery: "Select at least one visible queue row.",
      },
    ])

    expect(entries.map((entry) => entry.status)).toEqual(["running", "failed", "completed", "idle"])
    expect(entries[0]?.detail).toBe("Refreshing selected feed.")
    expect(entries[1]?.detail).toBe("Markdown export requires at least one article.")
    expect(entries[2]?.updatedAt).toBe("2026-04-30T12:00:00.000Z")

    const summary = summarizeReaderTaskStatuses(entries)

    expect(summary.runningCount).toBe(1)
    expect(summary.failedCount).toBe(1)
    expect(summary.completedCount).toBe(1)
    expect(summary.idleCount).toBe(1)
    expect(summary.headline).toBe("1 task needs attention.")
  })
})
