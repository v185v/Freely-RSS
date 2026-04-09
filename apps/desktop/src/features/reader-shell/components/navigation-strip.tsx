import { Button } from "@freelyrss/ui"

import type { NavigationEntry } from "../types"

type NavigationStripProps = {
  activeSourceId: string
  entries: NavigationEntry[]
  onSelectSource: (sourceId: string) => void
}

export function NavigationStrip({ activeSourceId, entries, onSelectSource }: NavigationStripProps) {
  return (
    <nav aria-label="Primary reader navigation" className="desktop-navigation">
      {entries.map((entry) => {
        const active = entry.id === activeSourceId

        return (
          <Button
            aria-pressed={active}
            className={
              active
                ? "desktop-navigation__button desktop-navigation__button--active"
                : "desktop-navigation__button"
            }
            key={entry.id}
            onClick={() => onSelectSource(entry.id)}
            size="sm"
            tone={active ? "neutral" : "ghost"}
          >
            <span className="desktop-navigation__title">{entry.title}</span>
            <span className="desktop-navigation__description">{entry.description}</span>
          </Button>
        )
      })}
    </nav>
  )
}
