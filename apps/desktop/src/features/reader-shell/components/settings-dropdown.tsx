import { useEffect, useRef, useState } from "react"

import type { ReaderDensityMode, ReaderThemeTone } from "../types"

type SettingsDropdownProps = {
  densityMode: ReaderDensityMode
  highContrastEnabled: boolean
  onOpenCacheSettings: () => void
  onOpenOpmlExport: () => void
  onOpenOpmlImport: () => void
  onOpenSyncSettings: () => void
  onSetDensityMode: (mode: ReaderDensityMode) => void
  onSetThemeTone: (tone: ReaderThemeTone) => void
  onToggleThemeTone: () => void
  themeTone: ReaderThemeTone
}

export function SettingsDropdown({
  densityMode,
  highContrastEnabled,
  onOpenCacheSettings,
  onOpenOpmlExport,
  onOpenOpmlImport,
  onOpenSyncSettings,
  onSetDensityMode,
  onSetThemeTone,
  onToggleThemeTone,
  themeTone,
}: SettingsDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="settings-dropdown" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Settings"
        className="settings-dropdown__trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        &#9881;
      </button>
      {open && (
        <div className="settings-dropdown__menu" role="menu">
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">Theme</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onSetThemeTone("daylight")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Light {themeTone === "daylight" && "✓"}
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onSetThemeTone("midnight")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Dark {themeTone === "midnight" && "✓"}
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onToggleThemeTone()
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              High contrast {highContrastEnabled && "✓"}
            </button>
          </div>
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">Density</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onSetDensityMode("compact")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Compact {densityMode === "compact" && "✓"}
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onSetDensityMode("comfortable")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Comfortable {densityMode === "comfortable" && "✓"}
            </button>
          </div>
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">Data</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onOpenSyncSettings()
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Sync settings
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onOpenCacheSettings()
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Cache management
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onOpenOpmlImport()
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Import OPML
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onOpenOpmlExport()
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              Export OPML
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
