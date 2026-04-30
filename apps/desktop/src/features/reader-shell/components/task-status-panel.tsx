import { Button, Surface } from "@freelyrss/ui"

import type {
  ReaderTaskStatusEntry,
  ReaderTaskStatusKind,
  ReaderTaskStatusState,
  ReaderTaskStatusSummary,
} from "../types"

type TaskStatusPanelProps = {
  entries: ReaderTaskStatusEntry[]
  onRetryTask: (taskId: ReaderTaskStatusKind) => void
  summary: ReaderTaskStatusSummary
}

function formatStatus(status: ReaderTaskStatusState) {
  switch (status) {
    case "completed":
      return "Completed"
    case "failed":
      return "Failed"
    case "idle":
      return "Ready"
    case "running":
      return "Running"
  }
}

function formatTaskTime(value: string | null) {
  if (!value) {
    return "No completion recorded"
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function TaskStatusPanel({ entries, onRetryTask, summary }: TaskStatusPanelProps) {
  return (
    <Surface aria-label="Task status" aria-live="polite" className="desktop-task-status" compact>
      <div className="desktop-task-status__header">
        <div>
          <span className="desktop-summary__label">Task monitor</span>
          <h2>Task status</h2>
        </div>
        <strong>{summary.headline}</strong>
      </div>

      <div className="desktop-task-status__summary">
        <div>
          <span className="desktop-summary__label">Running</span>
          <strong>{summary.runningCount}</strong>
        </div>
        <div>
          <span className="desktop-summary__label">Needs attention</span>
          <strong>{summary.failedCount}</strong>
        </div>
        <div>
          <span className="desktop-summary__label">Completed</span>
          <strong>{summary.completedCount}</strong>
        </div>
      </div>

      <ul className="desktop-task-status__list">
        {entries.map((entry) => (
          <li
            className={`desktop-task-status__item desktop-task-status__item--${entry.status}`}
            key={entry.id}
            role={entry.status === "failed" ? "alert" : undefined}
          >
            <div className="desktop-task-status__item-header">
              <div>
                <span className="desktop-summary__label">{entry.scope}</span>
                <strong>{entry.title}</strong>
              </div>
              <span className="desktop-task-status__badge">{formatStatus(entry.status)}</span>
            </div>
            <p>{entry.detail}</p>
            <div className="desktop-task-status__footer">
              <span>{formatTaskTime(entry.updatedAt)}</span>
              {entry.status === "failed" ? <span>{entry.recovery}</span> : null}
              {entry.status === "failed" && entry.retryLabel ? (
                <Button onClick={() => onRetryTask(entry.id)} size="sm" tone="neutral">
                  {entry.retryLabel}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Surface>
  )
}
