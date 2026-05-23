import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

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
  const { t, i18n } = useTranslation()
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
        aria-label={t("settings.label")}
        className="settings-dropdown__trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        &#9881;
      </button>
      {open && (
        <div className="settings-dropdown__menu" role="menu">
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">{t("settings.language")}</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                i18n.changeLanguage("zh-CN")
                localStorage.setItem("freelyrss.language", "zh-CN")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {t("settings.langZh")} {i18n.language === "zh-CN" && "✓"}
            </button>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                i18n.changeLanguage("en")
                localStorage.setItem("freelyrss.language", "en")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {t("settings.langEn")} {i18n.language === "en" && "✓"}
            </button>
          </div>
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">{t("settings.theme")}</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onSetThemeTone("daylight")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {t("settings.themeLight")} {themeTone === "daylight" && "✓"}
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
              {t("settings.themeDark")} {themeTone === "midnight" && "✓"}
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
              {t("settings.themeHighContrast")} {highContrastEnabled && "✓"}
            </button>
          </div>
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">{t("settings.density")}</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onSetDensityMode("compact")
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {t("settings.densityCompact")} {densityMode === "compact" && "✓"}
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
              {t("settings.densityComfortable")} {densityMode === "comfortable" && "✓"}
            </button>
          </div>
          <div className="settings-dropdown__group">
            <span className="settings-dropdown__group-label">{t("settings.data")}</span>
            <button
              className="settings-dropdown__item"
              onClick={() => {
                onOpenSyncSettings()
                setOpen(false)
              }}
              role="menuitem"
              type="button"
            >
              {t("settings.syncSettings")}
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
              {t("settings.cacheManagement")}
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
              {t("settings.importOpml")}
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
              {t("settings.exportOpml")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
