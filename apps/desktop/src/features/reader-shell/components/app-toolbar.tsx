import { type ChangeEvent, type ReactNode, useId } from "react"
import { useTranslation } from "react-i18next"

type AppToolbarProps = {
  onSearchChange: (value: string) => void
  searchValue: string
  settingsSlot: ReactNode
  syncActive?: boolean
}

export function AppToolbar({
  onSearchChange,
  searchValue,
  settingsSlot,
  syncActive = false,
}: AppToolbarProps) {
  const searchId = useId()
  const { t } = useTranslation()

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    onSearchChange(event.target.value)
  }

  return (
    <header className="app-toolbar">
      <div className="app-toolbar__brand">
        <span className="app-toolbar__logo">FreelyRSS</span>
      </div>
      <div className="app-toolbar__search">
        <input
          aria-label={t("toolbar.searchLabel")}
          className="app-toolbar__search-input"
          id={searchId}
          onChange={handleSearchChange}
          placeholder={t("toolbar.searchPlaceholder")}
          type="search"
          value={searchValue}
        />
      </div>
      <div className="app-toolbar__actions">
        {settingsSlot}
        {syncActive && (
          <span
            aria-label={t("toolbar.syncActive")}
            className="app-toolbar__sync-dot"
            role="status"
          />
        )}
      </div>
    </header>
  )
}
