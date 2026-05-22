import { type ChangeEvent, type ReactNode, useId } from "react"

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
          aria-label="Search articles"
          className="app-toolbar__search-input"
          id={searchId}
          onChange={handleSearchChange}
          placeholder="Search articles..."
          type="search"
          value={searchValue}
        />
      </div>
      <div className="app-toolbar__actions">
        {settingsSlot}
        {syncActive && (
          <span aria-label="Sync active" className="app-toolbar__sync-dot" role="status" />
        )}
      </div>
    </header>
  )
}
