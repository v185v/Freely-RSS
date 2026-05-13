import type { ISODateTimeString } from "@freelyrss/shared-types"

export type DesktopSyncConnectionStatus = "failed" | "not-configured" | "success" | "syncing"

export type DesktopSyncDeviceStatus = "local-only" | "registered" | "remote"

export interface DesktopSyncDevice {
  displayName: string
  id: string
  lastSeenAt: ISODateTimeString | null
  registeredAt: ISODateTimeString | null
  status: DesktopSyncDeviceStatus
}

export interface DesktopSyncSettings {
  accountEmail: string
  devices: DesktopSyncDevice[]
  enabled: boolean
  errorMessage: string | null
  lastSyncAt: ISODateTimeString | null
  serverUrl: string
  status: DesktopSyncConnectionStatus
}

export interface DesktopSyncSettingsDraft {
  accountEmail: string
  enabled: boolean
  serverUrl: string
}

export interface DesktopSyncValidationResult {
  message: string
  status: Extract<DesktopSyncConnectionStatus, "failed" | "success">
}

export const OFFICIAL_SYNC_SERVER_URL = "https://sync.freelyrss.dev"

const LOCALHOST_NAMES = new Set(["127.0.0.1", "localhost"])

function normalizeInput(value: string) {
  return value.trim()
}

function isValidAccountEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isAllowedServerUrl(url: URL) {
  if (url.protocol === "https:" && url.hostname === "sync.freelyrss.dev") {
    return true
  }

  return url.protocol === "http:" && LOCALHOST_NAMES.has(url.hostname)
}

export function createInitialDesktopSyncSettings(): DesktopSyncSettings {
  return {
    accountEmail: "",
    devices: [
      {
        displayName: "Desktop shell on this device",
        id: "device-local-desktop",
        lastSeenAt: null,
        registeredAt: null,
        status: "local-only",
      },
    ],
    enabled: false,
    errorMessage: null,
    lastSyncAt: null,
    serverUrl: "",
    status: "not-configured",
  }
}

export function createDesktopSyncDraft(settings: DesktopSyncSettings): DesktopSyncSettingsDraft {
  return {
    accountEmail: settings.accountEmail,
    enabled: settings.enabled,
    serverUrl: settings.serverUrl,
  }
}

export function validateDesktopSyncDraft(
  draft: DesktopSyncSettingsDraft,
): DesktopSyncValidationResult {
  if (!draft.enabled) {
    return {
      status: "failed",
      message: "Enable synchronization before testing the remote sync server.",
    }
  }

  const normalizedServerUrl = normalizeInput(draft.serverUrl)
  const normalizedAccountEmail = normalizeInput(draft.accountEmail)

  if (normalizedServerUrl.length === 0) {
    return {
      status: "failed",
      message: "Server URL is required before desktop sync can leave local-only mode.",
    }
  }

  if (!isValidAccountEmail(normalizedAccountEmail)) {
    return {
      status: "failed",
      message: "Account email is required for the account and device status surface.",
    }
  }

  let serverUrl: URL

  try {
    serverUrl = new URL(normalizedServerUrl)
  } catch {
    return {
      status: "failed",
      message: "Server URL must be an absolute HTTP or HTTPS address.",
    }
  }

  if (!isAllowedServerUrl(serverUrl)) {
    return {
      status: "failed",
      message:
        "The mock desktop sync probe only accepts https://sync.freelyrss.dev or a local http://localhost endpoint.",
    }
  }

  return {
    status: "success",
    message: "Remote sync settings are reachable and device metadata can be listed.",
  }
}

export function buildSyncingDesktopSettings(
  current: DesktopSyncSettings,
  draft: DesktopSyncSettingsDraft,
): DesktopSyncSettings {
  return {
    ...current,
    accountEmail: normalizeInput(draft.accountEmail),
    enabled: draft.enabled,
    errorMessage: null,
    serverUrl: normalizeInput(draft.serverUrl),
    status: "syncing",
  }
}

export function buildDisabledDesktopSyncSettings(
  current: DesktopSyncSettings,
): DesktopSyncSettings {
  return {
    ...current,
    enabled: false,
    errorMessage: null,
    lastSyncAt: null,
    status: "not-configured",
  }
}

export function buildTestedDesktopSyncSettings(
  current: DesktopSyncSettings,
  result: DesktopSyncValidationResult,
  syncedAt: ISODateTimeString,
): DesktopSyncSettings {
  if (result.status === "failed") {
    return {
      ...current,
      errorMessage: result.message,
      lastSyncAt: null,
      status: "failed",
    }
  }

  return {
    ...current,
    devices: [
      {
        displayName: "Desktop shell on this device",
        id: "device-local-desktop",
        lastSeenAt: syncedAt,
        registeredAt: syncedAt,
        status: "registered",
      },
      {
        displayName: "Mobile reader prototype",
        id: "device-mobile-prototype",
        lastSeenAt: "2026-05-10T14:40:00Z",
        registeredAt: "2026-05-09T08:30:00Z",
        status: "remote",
      },
    ],
    errorMessage: null,
    lastSyncAt: syncedAt,
    status: "success",
  }
}

export function formatDesktopSyncStatus(status: DesktopSyncConnectionStatus) {
  switch (status) {
    case "failed":
      return "Sync failed"
    case "not-configured":
      return "Not configured"
    case "success":
      return "Sync successful"
    case "syncing":
      return "Syncing"
  }
}

export function formatDesktopSyncDeviceStatus(status: DesktopSyncDeviceStatus) {
  switch (status) {
    case "local-only":
      return "Local only"
    case "registered":
      return "Registered"
    case "remote":
      return "Remote"
  }
}
