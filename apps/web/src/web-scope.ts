export const WEB_ALLOWED_OPERATION_IDS = [
  "remote-session-read",
  "remote-source-filter",
  "remote-article-list-read",
  "remote-article-detail-read",
  "remote-snapshot-search",
  "remote-user-state-display",
  "remote-annotation-display",
  "remote-attachment-metadata-display",
] as const

export const WEB_DEFERRED_OPERATION_IDS = [
  "local-feed-fetch",
  "desktop-sqlite-access",
  "desktop-tauri-command",
  "full-offline-cache",
  "complex-rule-editor",
  "deep-system-integration",
  "opml-import-export",
  "local-ai-generation",
  "webhook-dispatch",
  "knowledge-base-export",
  "batch-operations",
  "local-rest-api",
  "media-cache-management",
] as const

export type WebAllowedOperationId = (typeof WEB_ALLOWED_OPERATION_IDS)[number]
export type WebDeferredOperationId = (typeof WEB_DEFERRED_OPERATION_IDS)[number]
export type WebOperationId = WebAllowedOperationId | WebDeferredOperationId

export interface WebRequirement {
  id: string
  operationId: WebOperationId
  status: "in-scope" | "deferred"
  blocksInitialWebEntry: boolean
}

export interface WebScopeContract {
  mode: "remote-sync-access"
  allowedOperationIds: readonly WebAllowedOperationId[]
  deferredOperationIds: readonly WebDeferredOperationId[]
  requirements: readonly WebRequirement[]
}

export interface WebScopeSummary {
  allowedRequirements: number
  deferredRequirements: number
  blockingRequirements: number
  scopeViolations: string[]
}

export const WEB_SCOPE_CONTRACT: WebScopeContract = {
  mode: "remote-sync-access",
  allowedOperationIds: WEB_ALLOWED_OPERATION_IDS,
  deferredOperationIds: WEB_DEFERRED_OPERATION_IDS,
  requirements: [
    {
      id: "remote-account-session",
      operationId: "remote-session-read",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-source-filters",
      operationId: "remote-source-filter",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-article-queue",
      operationId: "remote-article-list-read",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-article-detail",
      operationId: "remote-article-detail-read",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-snapshot-search",
      operationId: "remote-snapshot-search",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-user-state-display",
      operationId: "remote-user-state-display",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-annotation-display",
      operationId: "remote-annotation-display",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "remote-attachment-metadata-display",
      operationId: "remote-attachment-metadata-display",
      status: "in-scope",
      blocksInitialWebEntry: false,
    },
    {
      id: "desktop-local-feed-fetching",
      operationId: "local-feed-fetch",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "desktop-sqlite-storage",
      operationId: "desktop-sqlite-access",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "desktop-tauri-host-commands",
      operationId: "desktop-tauri-command",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "complete-offline-cache",
      operationId: "full-offline-cache",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "complex-rule-editor",
      operationId: "complex-rule-editor",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "deep-system-integration",
      operationId: "deep-system-integration",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "opml-import-export",
      operationId: "opml-import-export",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "local-ai-generation",
      operationId: "local-ai-generation",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "webhook-dispatch",
      operationId: "webhook-dispatch",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "knowledge-base-export",
      operationId: "knowledge-base-export",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "batch-operations",
      operationId: "batch-operations",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "local-rest-api",
      operationId: "local-rest-api",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
    {
      id: "media-cache-management",
      operationId: "media-cache-management",
      status: "deferred",
      blocksInitialWebEntry: false,
    },
  ],
}

export function summarizeWebScopeRequirements(
  requirements: readonly WebRequirement[] = WEB_SCOPE_CONTRACT.requirements,
): WebScopeSummary {
  const deferredIds = new Set<WebOperationId>(WEB_SCOPE_CONTRACT.deferredOperationIds)
  const allowedIds = new Set<WebOperationId>(WEB_SCOPE_CONTRACT.allowedOperationIds)
  const scopeViolations = requirements.flatMap((requirement) => {
    if (requirement.status === "in-scope" && deferredIds.has(requirement.operationId)) {
      return [`${requirement.id} marks deferred operation ${requirement.operationId} in scope`]
    }

    if (requirement.status === "deferred" && allowedIds.has(requirement.operationId)) {
      return [`${requirement.id} defers allowed operation ${requirement.operationId}`]
    }

    return []
  })

  return {
    allowedRequirements: requirements.filter((requirement) => requirement.status === "in-scope")
      .length,
    deferredRequirements: requirements.filter((requirement) => requirement.status === "deferred")
      .length,
    blockingRequirements: requirements.filter((requirement) => requirement.blocksInitialWebEntry)
      .length,
    scopeViolations,
  }
}
