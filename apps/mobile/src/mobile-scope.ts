export const MOBILE_ALLOWED_OPERATION_IDS = [
  "account-login",
  "sync-snapshot-read",
  "article-reading",
  "search-synchronized-library",
  "note-capture",
  "podcast-consumption",
  "offline-cache-read",
  "mobile-audio-playback",
  "background-media-resume",
  "system-share-sheet",
] as const

export const MOBILE_DEFERRED_OPERATION_IDS = [
  "local-feed-fetching",
  "desktop-sqlite-access",
  "tauri-command-access",
  "complex-rule-editing",
  "opml-import-export",
  "ai-generation-controls",
  "webhook-dispatch",
  "knowledge-base-export",
  "local-rest-api-access",
  "desktop-cache-eviction",
] as const

export type MobileAllowedOperationId = (typeof MOBILE_ALLOWED_OPERATION_IDS)[number]
export type MobileDeferredOperationId = (typeof MOBILE_DEFERRED_OPERATION_IDS)[number]
export type MobileOperationId = MobileAllowedOperationId | MobileDeferredOperationId

export interface MobileRequirement {
  id: string
  operationId: MobileOperationId
  status: "in-scope" | "deferred"
  blocksInitialShell: boolean
}

export interface MobileScopeContract {
  allowedOperationIds: readonly MobileAllowedOperationId[]
  deferredOperationIds: readonly MobileDeferredOperationId[]
  mode: "mobile-reading-priority"
  requirements: readonly MobileRequirement[]
}

export interface MobileScopeSummary {
  blockingRequirements: number
  scopeViolations: string[]
}

export const MOBILE_SCOPE_CONTRACT: MobileScopeContract = {
  allowedOperationIds: MOBILE_ALLOWED_OPERATION_IDS,
  deferredOperationIds: MOBILE_DEFERRED_OPERATION_IDS,
  mode: "mobile-reading-priority",
  requirements: [
    {
      id: "login-sync-entry",
      operationId: "account-login",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "remote-sync-snapshot",
      operationId: "sync-snapshot-read",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "reading-surface",
      operationId: "article-reading",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "mobile-search",
      operationId: "search-synchronized-library",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "note-entry",
      operationId: "note-capture",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "podcast-card",
      operationId: "podcast-consumption",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "offline-cache-readiness",
      operationId: "offline-cache-read",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "mobile-audio-player",
      operationId: "mobile-audio-playback",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "background-media-resume",
      operationId: "background-media-resume",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "system-share-sheet",
      operationId: "system-share-sheet",
      status: "in-scope",
      blocksInitialShell: false,
    },
    {
      id: "desktop-local-fetching",
      operationId: "local-feed-fetching",
      status: "deferred",
      blocksInitialShell: false,
    },
    {
      id: "rules-admin",
      operationId: "complex-rule-editing",
      status: "deferred",
      blocksInitialShell: false,
    },
    {
      id: "desktop-integrations",
      operationId: "webhook-dispatch",
      status: "deferred",
      blocksInitialShell: false,
    },
  ],
}

export function summarizeMobileScopeRequirements(
  contract: MobileScopeContract = MOBILE_SCOPE_CONTRACT,
): MobileScopeSummary {
  const allowedOperations = new Set<string>(contract.allowedOperationIds)
  const deferredOperations = new Set<string>(contract.deferredOperationIds)
  const scopeViolations = contract.requirements.flatMap((requirement) => {
    if (requirement.status === "in-scope" && !allowedOperations.has(requirement.operationId)) {
      return [`${requirement.id}:${requirement.operationId}:not-allowed`]
    }

    if (requirement.status === "deferred" && !deferredOperations.has(requirement.operationId)) {
      return [`${requirement.id}:${requirement.operationId}:not-deferred`]
    }

    return []
  })

  return {
    blockingRequirements: contract.requirements.filter(
      (requirement) => requirement.blocksInitialShell,
    ).length,
    scopeViolations,
  }
}
