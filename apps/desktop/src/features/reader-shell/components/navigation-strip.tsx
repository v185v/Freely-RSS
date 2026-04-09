import type { Ref } from "react"

import { Button } from "@freelyrss/ui"

import type { NavigationEntry } from "../types"

type NavigationStripProps = {
  activeSourceId: string
  describedBy?: string
  entries: NavigationEntry[]
  navigationId: string
  navigationRef?: Ref<HTMLElement>
  onSelectSource: (sourceId: string) => void
}

export function NavigationStrip({
  activeSourceId,
  describedBy,
  entries,
  navigationId,
  navigationRef,
  onSelectSource,
}: NavigationStripProps) {
  return (
    <nav
      aria-describedby={describedBy}
      aria-keyshortcuts="Alt+1"
      aria-label="Primary reader navigation"
      className="desktop-navigation"
      id={navigationId}
      ref={navigationRef}
      tabIndex={-1}
    >
      {entries.map((entry) => {
        const active = entry.id === activeSourceId

        return (
          <Button
            aria-current={active ? "page" : undefined}
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
