import { Button, ListSection, Surface } from "@freelyrss/ui"

import { formatCacheBytes } from "../cache-policy"
import type { ReaderCacheStatus } from "../types"

type CacheMaintenanceCardProps = {
  errorMessage: string | null
  isRunning: boolean
  onRunCleanup: () => void
  status: ReaderCacheStatus
}

function buildStatusMessage(status: ReaderCacheStatus) {
  if (status.overBudgetBytes > 0 && status.policyMismatchBytes > 0) {
    return `${formatCacheBytes(status.overBudgetBytes)} over budget, with ${formatCacheBytes(status.policyMismatchBytes)} already violating source cache policy.`
  }

  if (status.overBudgetBytes > 0) {
    return `${formatCacheBytes(status.overBudgetBytes)} over budget. Cleanup will evict the oldest non-protected cache entries first.`
  }

  if (status.policyMismatchBytes > 0) {
    return `${formatCacheBytes(status.policyMismatchBytes)} violates the current per-feed cache policy and can be reclaimed immediately.`
  }

  return "Cache usage is within budget and aligned with current source policy."
}

function buildLastCleanupMessage(status: ReaderCacheStatus) {
  const report = status.latestCleanup

  if (!report) {
    return "No cache cleanup has been recorded yet."
  }

  if (report.evictedEntryCount === 0 && report.stillOverBudgetBytes === 0) {
    return `Last cleanup checked the cache on ${new Date(report.completedAt).toLocaleString(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    )} and did not need to remove anything.`
  }

  const summary = `Last cleanup freed ${formatCacheBytes(report.evictedBytes)} across ${report.evictedEntryCount} entries.`

  if (report.stillOverBudgetBytes > 0) {
    return `${summary} ${formatCacheBytes(report.stillOverBudgetBytes)} still remains over budget because only protected entries were left.`
  }

  return summary
}

export function CacheMaintenanceCard({
  errorMessage,
  isRunning,
  onRunCleanup,
  status,
}: CacheMaintenanceCardProps) {
  const hasPendingCleanup = status.overBudgetBytes > 0 || status.policyMismatchBytes > 0
  const visibleCandidates = status.cleanupCandidates.slice(0, 4)

  return (
    <ListSection description="Free up disk space by removing cached content" title="Cache cleanup">
      <Surface className="desktop-cache-maintenance" compact>
        <div className="desktop-cache-maintenance__summary">
          <div>
            <span className="desktop-summary__label">Total cached</span>
            <strong>{formatCacheBytes(status.totalBytes)}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Budget</span>
            <strong>{formatCacheBytes(status.limitBytes)}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Protected cache</span>
            <strong>{formatCacheBytes(status.protectedBytes)}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Cleanup candidates</span>
            <strong>{formatCacheBytes(status.evictableBytes)}</strong>
          </div>
        </div>

        <div className="desktop-editor__message desktop-editor__message--warning">
          <span className="desktop-summary__label">Budget status</span>
          <p>{buildStatusMessage(status)}</p>
        </div>

        <div className="desktop-cache-maintenance__facts">
          <div>
            <span className="desktop-summary__label">Protected articles</span>
            <strong>{status.protectedArticleCount}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Queued cleanup entries</span>
            <strong>{status.cleanupCandidates.length}</strong>
          </div>
        </div>

        {visibleCandidates.length > 0 ? (
          <div className="desktop-cache-maintenance__candidate-list">
            <span className="desktop-summary__label">Planned cleanup order</span>
            <ul>
              {visibleCandidates.map((candidate) => (
                <li key={`${candidate.reason}-${candidate.path}`}>
                  <strong>{candidate.articleTitle}</strong>
                  <span>
                    {candidate.kind === "attachment" ? "attachment" : "content"} /{" "}
                    {formatCacheBytes(candidate.bytes)} /{" "}
                    {candidate.reason === "policy-mismatch"
                      ? "policy mismatch"
                      : "least recently used"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="desktop-cache-maintenance__notes">
          <p>LRU cleanup protects starred, read-later, and note-bearing articles.</p>
          <p>Per-feed policy mismatches are reclaimed before budget cleanup runs.</p>
          <p>{buildLastCleanupMessage(status)}</p>
        </div>

        {errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Cleanup status</span>
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button disabled={isRunning} onClick={onRunCleanup} size="sm" tone="neutral">
            {isRunning ? "Running..." : "Run cleanup"}
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
