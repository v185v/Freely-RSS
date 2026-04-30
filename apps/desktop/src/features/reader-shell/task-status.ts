import type { ReaderTaskStatusEntry, ReaderTaskStatusKind, ReaderTaskStatusSummary } from "./types"

type BuildReaderTaskStatusInput = {
  completedDetail?: string | null
  error?: unknown
  id: ReaderTaskStatusKind
  idleDetail: string
  isRunning: boolean
  recovery: string
  retryLabel?: string | null
  runningDetail?: string
  scope: string
  title: string
  updatedAt?: string | null
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return null
  }

  return error instanceof Error ? error.message : String(error)
}

export function buildReaderTaskStatuses(
  tasks: BuildReaderTaskStatusInput[],
): ReaderTaskStatusEntry[] {
  return tasks.map((task) => {
    const errorMessage = getErrorMessage(task.error)
    const status = task.isRunning
      ? "running"
      : errorMessage
        ? "failed"
        : task.completedDetail
          ? "completed"
          : "idle"
    const detail =
      (status === "running"
        ? (task.runningDetail ?? task.idleDetail)
        : status === "failed"
          ? errorMessage
          : status === "completed"
            ? task.completedDetail
            : task.idleDetail) ?? task.idleDetail

    return {
      detail,
      id: task.id,
      recovery: task.recovery,
      retryLabel: task.retryLabel ?? null,
      scope: task.scope,
      status,
      title: task.title,
      updatedAt: task.updatedAt ?? null,
    }
  })
}

export function summarizeReaderTaskStatuses(
  entries: ReaderTaskStatusEntry[],
): ReaderTaskStatusSummary {
  const runningCount = entries.filter((entry) => entry.status === "running").length
  const failedCount = entries.filter((entry) => entry.status === "failed").length
  const completedCount = entries.filter((entry) => entry.status === "completed").length
  const idleCount = entries.filter((entry) => entry.status === "idle").length

  let headline = "No background tasks are running."

  if (failedCount > 0) {
    headline =
      failedCount === 1 ? "1 task needs attention." : `${failedCount} tasks need attention.`
  } else if (runningCount > 0) {
    headline = `${runningCount} task${runningCount === 1 ? "" : "s"} running.`
  } else if (completedCount > 0) {
    headline = `${completedCount} task${completedCount === 1 ? "" : "s"} completed in this shell session.`
  }

  return {
    completedCount,
    failedCount,
    headline,
    idleCount,
    runningCount,
  }
}
