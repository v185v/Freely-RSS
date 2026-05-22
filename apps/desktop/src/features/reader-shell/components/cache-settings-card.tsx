import { useEffect, useState } from "react"

import { Button, ListSection, Surface, TextInput } from "@freelyrss/ui"

import {
  CACHE_LIMIT_STEP_MB,
  CACHE_POLICY_OPTIONS,
  bytesToMegabytes,
  formatCacheLimit,
  getCachePolicyOption,
  megabytesToBytes,
} from "../cache-policy"
import type { ReaderCacheSettings } from "../types"

type CacheSettingsCardProps = {
  errorMessage: string | null
  isSaving: boolean
  onSaveSettings: (settings: ReaderCacheSettings) => void
  settings: ReaderCacheSettings
}

type CacheSettingsDraft = {
  defaultPolicy: ReaderCacheSettings["defaultPolicy"]
  maxMegabytes: string
}

function buildDraft(settings: ReaderCacheSettings): CacheSettingsDraft {
  return {
    defaultPolicy: settings.defaultPolicy,
    maxMegabytes: String(bytesToMegabytes(settings.maxBytes)),
  }
}

export function CacheSettingsCard({
  errorMessage,
  isSaving,
  onSaveSettings,
  settings,
}: CacheSettingsCardProps) {
  const [draft, setDraft] = useState<CacheSettingsDraft>(() => buildDraft(settings))
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(buildDraft(settings))
    setLocalError(null)
  }, [settings])

  function updateDraft<Key extends keyof CacheSettingsDraft>(
    key: Key,
    value: CacheSettingsDraft[Key],
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
    setLocalError(null)
  }

  function handleResetDraft() {
    setDraft(buildDraft(settings))
    setLocalError(null)
  }

  function handleSaveSettings() {
    const normalizedMegabytes = draft.maxMegabytes.trim()

    if (normalizedMegabytes.length === 0) {
      setLocalError("Global cache limit must be a positive whole number of megabytes.")
      return
    }

    const parsedMegabytes = Number(normalizedMegabytes)

    if (!Number.isInteger(parsedMegabytes) || parsedMegabytes <= 0) {
      setLocalError("Global cache limit must be a positive whole number of megabytes.")
      return
    }

    onSaveSettings({
      defaultPolicy: draft.defaultPolicy,
      maxBytes: megabytesToBytes(parsedMegabytes),
    })
  }

  return (
    <ListSection description="Configure content caching defaults" title="Cache settings">
      <Surface className="desktop-cache-settings" compact>
        <div className="desktop-cache-settings__summary">
          <div>
            <span className="desktop-summary__label">Global limit</span>
            <strong>{formatCacheLimit(settings.maxBytes)}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Default policy</span>
            <strong>{getCachePolicyOption(settings.defaultPolicy).label}</strong>
          </div>
        </div>

        <div className="desktop-editor__form">
          <TextInput
            aria-label="Global cache limit (MB)"
            hint="Maximum disk space for cached content."
            label="Global cache limit (MB)"
            min={CACHE_LIMIT_STEP_MB}
            onChange={(event) => updateDraft("maxMegabytes", event.target.value)}
            placeholder="e.g. 2048"
            step={CACHE_LIMIT_STEP_MB}
            type="number"
            value={draft.maxMegabytes}
          />

          <div className="desktop-editor__policy-field">
            <span className="desktop-summary__label">Default cache policy</span>
            <p className="desktop-editor__policy-note">
              New feeds inherit this policy until they are edited with a source-specific cache rule.
            </p>
            <fieldset aria-label="Default cache policy" className="desktop-editor__policy-grid">
              {CACHE_POLICY_OPTIONS.map((option) => (
                <Button
                  aria-pressed={draft.defaultPolicy === option.value}
                  className={
                    draft.defaultPolicy === option.value
                      ? "desktop-editor__policy-button desktop-editor__policy-button--active"
                      : "desktop-editor__policy-button"
                  }
                  key={option.value}
                  onClick={() => updateDraft("defaultPolicy", option.value)}
                  size="sm"
                  tone={draft.defaultPolicy === option.value ? "neutral" : "ghost"}
                >
                  {option.label}
                </Button>
              ))}
            </fieldset>
            <p className="desktop-editor__policy-description">
              {getCachePolicyOption(draft.defaultPolicy).description}
            </p>
          </div>
        </div>

        {localError || errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Cache settings status</span>
            <p>{localError ?? errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button disabled={isSaving} onClick={handleSaveSettings} size="sm" tone="neutral">
            {isSaving ? "Saving..." : "Save cache settings"}
          </Button>
          <Button disabled={isSaving} onClick={handleResetDraft} size="sm" tone="ghost">
            Reset draft
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
