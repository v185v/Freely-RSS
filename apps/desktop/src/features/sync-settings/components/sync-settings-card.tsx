import { useEffect, useState } from "react"

import { Button, ListSection, Surface, TextInput } from "@freelyrss/ui"

import {
  type DesktopSyncSettings,
  type DesktopSyncSettingsDraft,
  OFFICIAL_SYNC_SERVER_URL,
  buildDisabledDesktopSyncSettings,
  buildSyncingDesktopSettings,
  buildTestedDesktopSyncSettings,
  createDesktopSyncDraft,
  createInitialDesktopSyncSettings,
  formatDesktopSyncDeviceStatus,
  formatDesktopSyncStatus,
  validateDesktopSyncDraft,
} from "../sync-settings"

type SyncSettingsCardProps = {
  initialSettings?: DesktopSyncSettings
  now?: () => string
}

const MOCK_SYNC_PROBE_DELAY_MS = 120
const DEFAULT_INITIAL_DESKTOP_SYNC_SETTINGS = createInitialDesktopSyncSettings()

function formatSyncTime(value: string | null) {
  if (!value) {
    return "Never synced"
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function statusClassName(status: DesktopSyncSettings["status"]) {
  return `desktop-sync-settings__status desktop-sync-settings__status--${status}`
}

export function SyncSettingsCard({
  initialSettings = DEFAULT_INITIAL_DESKTOP_SYNC_SETTINGS,
  now = () => new Date().toISOString(),
}: SyncSettingsCardProps) {
  const [settings, setSettings] = useState<DesktopSyncSettings>(initialSettings)
  const [draft, setDraft] = useState<DesktopSyncSettingsDraft>(() =>
    createDesktopSyncDraft(initialSettings),
  )

  useEffect(() => {
    setSettings(initialSettings)
    setDraft(createDesktopSyncDraft(initialSettings))
  }, [initialSettings])

  function updateDraft<Key extends keyof DesktopSyncSettingsDraft>(
    key: Key,
    value: DesktopSyncSettingsDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleDisableSync() {
    const nextSettings = buildDisabledDesktopSyncSettings(settings)

    setSettings(nextSettings)
    setDraft(createDesktopSyncDraft(nextSettings))
  }

  async function handleSaveAndTest() {
    const syncingSettings = buildSyncingDesktopSettings(settings, draft)

    setSettings(syncingSettings)

    await new Promise((resolve) => window.setTimeout(resolve, MOCK_SYNC_PROBE_DELAY_MS))

    const result = validateDesktopSyncDraft(draft)
    const testedSettings = buildTestedDesktopSyncSettings(syncingSettings, result, now())

    setSettings(testedSettings)
    setDraft(createDesktopSyncDraft(testedSettings))
  }

  return (
    <ListSection
      description="Step 66 keeps account, server, device, and user-visible sync status in a dedicated settings surface. It does not store master keys, schedule uploads, or call WebDAV adapters."
      title="Sync settings"
    >
      <Surface aria-live="polite" className="desktop-sync-settings" compact>
        <div className="desktop-sync-settings__hero">
          <div>
            <span className="desktop-summary__label">Synchronization</span>
            <strong>{formatDesktopSyncStatus(settings.status)}</strong>
            <p>
              Client-held encryption remains outside this UI. This panel only captures the user
              visible account/server configuration and device status needed before transport work.
            </p>
          </div>
          <span className={statusClassName(settings.status)}>
            {formatDesktopSyncStatus(settings.status)}
          </span>
        </div>

        <div className="desktop-sync-settings__summary">
          <div>
            <span className="desktop-summary__label">Server</span>
            <strong>{settings.serverUrl || "not set"}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Account</span>
            <strong>{settings.accountEmail || "not signed in"}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Last sync</span>
            <strong>{formatSyncTime(settings.lastSyncAt)}</strong>
          </div>
        </div>

        <div className="desktop-sync-settings__form">
          <label className="desktop-sync-settings__toggle">
            <input
              aria-label="Enable desktop synchronization"
              checked={draft.enabled}
              onChange={(event) => updateDraft("enabled", event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Enable desktop synchronization</strong>
              <small>Sync can be disabled without changing local reader data.</small>
            </span>
          </label>

          <TextInput
            aria-label="Sync server URL"
            hint={`Use ${OFFICIAL_SYNC_SERVER_URL} for the current mock success path, or http://localhost for local server development.`}
            label="Sync server URL"
            onChange={(event) => updateDraft("serverUrl", event.target.value)}
            placeholder={OFFICIAL_SYNC_SERVER_URL}
            value={draft.serverUrl}
          />

          <TextInput
            aria-label="Sync account email"
            hint="This is account metadata only; it is not a recovery secret and does not unlock event payloads."
            label="Account email"
            onChange={(event) => updateDraft("accountEmail", event.target.value)}
            placeholder="reader@example.com"
            type="email"
            value={draft.accountEmail}
          />
        </div>

        {settings.errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error" role="alert">
            <span className="desktop-summary__label">Sync error</span>
            <p>{settings.errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-sync-settings__devices">
          <div className="desktop-sync-settings__devices-header">
            <span className="desktop-summary__label">Devices</span>
            <strong>{settings.devices.length}</strong>
          </div>
          <ul>
            {settings.devices.map((device) => (
              <li key={device.id}>
                <div>
                  <strong>{device.displayName}</strong>
                  <span>{device.id}</span>
                </div>
                <div>
                  <span>{formatDesktopSyncDeviceStatus(device.status)}</span>
                  <small>{formatSyncTime(device.lastSeenAt)}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="desktop-sync-settings__actions">
          <Button
            disabled={settings.status === "syncing"}
            onClick={handleSaveAndTest}
            size="sm"
            tone="neutral"
          >
            {settings.status === "syncing" ? "Testing..." : "Save and test sync"}
          </Button>
          <Button
            disabled={settings.status === "syncing"}
            onClick={handleDisableSync}
            size="sm"
            tone="ghost"
          >
            Disable sync
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
