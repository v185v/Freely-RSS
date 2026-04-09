import { Button, ListRow, ListSection, SplitPane, Surface } from "@freelyrss/ui"

import type { SourceRow } from "../types"

type SourcePaneProps = {
  activeSourceId: string
  onSelectSource: (sourceId: string) => void
  sourceSections: Array<{
    description: string
    rows: SourceRow[]
    title: string
  }>
}

export function SourcePane({ activeSourceId, onSelectSource, sourceSections }: SourcePaneProps) {
  return (
    <SplitPane aria-label="Source context" className="desktop-pane">
      <Surface className="desktop-pane__surface desktop-pane__surface--nav">
        <div className="desktop-pane__header">
          <p className="desktop-pane__eyebrow">Left pane</p>
          <h2>Sources</h2>
          <p className="desktop-pane__description">
            Navigation now resolves through route state instead of a local component-only selection.
          </p>
        </div>

        <div className="desktop-pane__scroll">
          {sourceSections.map((section) => (
            <ListSection
              description={section.description}
              key={section.title}
              title={section.title}
            >
              {section.rows.map((row) => (
                <ListRow
                  active={row.id === activeSourceId}
                  className={
                    row.depth === 1
                      ? "desktop-source-row desktop-source-row--child"
                      : "desktop-source-row"
                  }
                  eyebrow={row.eyebrow}
                  key={row.id}
                  meta={row.meta}
                  onClick={() => onSelectSource(row.id)}
                  summary={row.description}
                  title={row.title}
                />
              ))}
            </ListSection>
          ))}
        </div>

        <div className="desktop-pane__footer">
          <Button size="sm" tone="ghost">
            Add source
          </Button>
          <Button size="sm" tone="neutral">
            Import OPML
          </Button>
        </div>
      </Surface>
    </SplitPane>
  )
}
