import { useEffect, useState } from "react"

import type { FeedDto } from "@freelyrss/shared-types"
import { Button, ListSection, Surface, TextInput } from "@freelyrss/ui"

type FeedEditorCardProps = {
  errorMessage: string | null
  feed: FeedDto | null
  isRefreshing: boolean
  isSaving: boolean
  onRefreshFeed: (feedId: FeedDto["id"]) => void
  onSaveFeed: (input: {
    customName: string | null
    feedId: FeedDto["id"]
    icon: string | null
    title: string
    updateInterval: number | null
  }) => void
}

type FeedEditorDraft = {
  customName: string
  icon: string
  title: string
  updateInterval: string
}

function buildDraft(feed: FeedDto | null): FeedEditorDraft {
  return {
    title: feed?.title ?? "",
    customName: feed?.customName ?? "",
    updateInterval: feed?.updateInterval == null ? "" : String(feed.updateInterval),
    icon: feed?.icon ?? "",
  }
}

function normalizeNullableText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatOptionalDateTime(value: string | null) {
  if (!value) {
    return "Not recorded yet"
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function FeedEditorCard({
  errorMessage,
  feed,
  isRefreshing,
  isSaving,
  onRefreshFeed,
  onSaveFeed,
}: FeedEditorCardProps) {
  const [draft, setDraft] = useState<FeedEditorDraft>(() => buildDraft(feed))
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(buildDraft(feed))
    setLocalError(null)
  }, [feed])

  if (!feed) {
    return (
      <ListSection
        description="Quick views and folders remain selectable, but edit controls only appear when a concrete feed is active."
        title="Feed editor"
      >
        <div className="desktop-empty-state desktop-empty-state--compact">
          <p className="desktop-empty-state__eyebrow">Selection required</p>
          <h3>Choose a feed to edit source metadata.</h3>
          <p>
            Step 34 keeps source editing in the desktop shell command layer instead of pushing it
            into the fetch engine, shared DTO assembly, or base UI primitives.
          </p>
        </div>
      </ListSection>
    )
  }

  const activeFeed = feed
  const displayTitle = normalizeNullableText(draft.customName) ?? draft.title.trim()

  function updateDraft<Key extends keyof FeedEditorDraft>(key: Key, value: FeedEditorDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setLocalError(null)
  }

  function handleResetDraft() {
    setDraft(buildDraft(activeFeed))
    setLocalError(null)
  }

  function handleSaveFeed() {
    const title = draft.title.trim()

    if (title.length === 0) {
      setLocalError("Source title cannot be empty.")
      return
    }

    const normalizedInterval = draft.updateInterval.trim()
    let updateInterval: number | null = null

    if (normalizedInterval.length > 0) {
      const parsedValue = Number(normalizedInterval)

      if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        setLocalError("Update interval must be a positive whole number of minutes.")
        return
      }

      updateInterval = parsedValue
    }

    onSaveFeed({
      feedId: activeFeed.id,
      title,
      customName: normalizeNullableText(draft.customName),
      updateInterval,
      icon: normalizeNullableText(draft.icon),
    })
  }

  return (
    <ListSection
      description="Feed edits stay route-adjacent in the shell, while the mock repository remains the only writer for source facts."
      title="Feed editor"
    >
      <Surface className="desktop-editor" compact>
        <div className="desktop-editor__summary">
          <div>
            <span className="desktop-summary__label">Preview label</span>
            <strong>{displayTitle}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Health</span>
            <strong>{activeFeed.healthStatus}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Failures</span>
            <strong>{activeFeed.consecutiveFailures}</strong>
          </div>
        </div>

        <div className="desktop-editor__facts">
          <div>
            <span className="desktop-summary__label">Feed URL</span>
            <strong>{activeFeed.feedUrl}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Last checked</span>
            <strong>{formatOptionalDateTime(activeFeed.lastCheckedAt)}</strong>
          </div>
          <div>
            <span className="desktop-summary__label">Last success</span>
            <strong>{formatOptionalDateTime(activeFeed.lastSuccessAt)}</strong>
          </div>
        </div>

        <div className="desktop-editor__form">
          <TextInput
            aria-label="Source title"
            hint="Renaming the feed title updates the shared display text consumed by the shell."
            label="Source title"
            onChange={(event) => updateDraft("title", event.target.value)}
            value={draft.title}
          />

          <TextInput
            aria-label="Custom display label"
            hint="Leave blank to fall back to the source title."
            label="Custom display label"
            onChange={(event) => updateDraft("customName", event.target.value)}
            placeholder="Optional reader-facing label"
            value={draft.customName}
          />

          <TextInput
            aria-label="Update interval (minutes)"
            hint="Blank keeps the global default until real per-feed persistence arrives."
            label="Update interval (minutes)"
            min={1}
            onChange={(event) => updateDraft("updateInterval", event.target.value)}
            placeholder="e.g. 60"
            step={1}
            type="number"
            value={draft.updateInterval}
          />

          <TextInput
            aria-label="Icon URL"
            hint="Icon edits stay on the desktop-side source metadata path."
            label="Icon URL"
            onChange={(event) => updateDraft("icon", event.target.value)}
            placeholder="https://assets.example/icon.svg"
            value={draft.icon}
          />
        </div>

        {activeFeed.lastErrorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--warning">
            <span className="desktop-summary__label">Latest health detail</span>
            <p>{activeFeed.lastErrorMessage}</p>
          </div>
        ) : null}

        {localError || errorMessage ? (
          <div className="desktop-editor__message desktop-editor__message--error">
            <span className="desktop-summary__label">Editor status</span>
            <p>{localError ?? errorMessage}</p>
          </div>
        ) : null}

        <div className="desktop-editor__actions">
          <Button
            disabled={isSaving || isRefreshing}
            onClick={handleSaveFeed}
            size="sm"
            tone="neutral"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
          <Button
            disabled={isSaving || isRefreshing}
            onClick={handleResetDraft}
            size="sm"
            tone="ghost"
          >
            Reset draft
          </Button>
          <Button
            disabled={isSaving || isRefreshing}
            onClick={() => onRefreshFeed(activeFeed.id)}
            size="sm"
            tone="ghost"
          >
            {isRefreshing ? "Refreshing..." : "Manual refresh"}
          </Button>
        </div>
      </Surface>
    </ListSection>
  )
}
