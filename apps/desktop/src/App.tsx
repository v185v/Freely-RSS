import {
  Button,
  ListRow,
  ListSection,
  SplitLayout,
  SplitPane,
  Surface,
  TextInput,
  ThemeRoot,
} from "@freelyrss/ui"

function App() {
  return (
    <ThemeRoot>
      <main className="desktop-shell">
        <header className="desktop-shell__header">
          <div className="desktop-shell__title-block">
            <p className="desktop-shell__eyebrow">Stage 2 / Step 12</p>
            <h1>Shared UI primitives are now the desktop shell boundary.</h1>
            <p className="desktop-shell__lead">
              `packages/ui` now owns the theme tokens, split-panel scaffolding, list rows, buttons,
              and text input styling. The desktop app only composes those primitives and still
              avoids business queries or stateful reader logic.
            </p>
          </div>
          <div className="desktop-shell__controls">
            <TextInput
              aria-label="Search demo"
              hint="Workspace package styles this control through shared theme variables."
              label="Quick search"
              placeholder="Search feeds, tags, or commands"
            />
            <div className="desktop-shell__actions">
              <Button tone="ghost">Token-driven shell</Button>
              <Button tone="primary">Reader layout next</Button>
            </div>
          </div>
        </header>

        <SplitLayout>
          <SplitPane>
            <Surface compact>
              <ListSection
                actions={<Button size="sm">Add source</Button>}
                description="Pure display primitives only. No feed fetching or tree state yet."
                title="Source clusters"
              >
                <ListRow
                  active
                  eyebrow="Pinned"
                  meta="42 feeds"
                  summary="A placeholder left rail showing how shared rows and sections compose."
                  title="Daily reading desk"
                />
                <ListRow
                  eyebrow="Recent"
                  meta="18 feeds"
                  summary="Keeps layout responsibility inside the shared package instead of App.tsx CSS."
                  title="Engineering briefs"
                />
                <ListRow
                  eyebrow="Queue"
                  meta="7 feeds"
                  summary="Ready for Step 15 to evolve into the real subscription tree."
                  title="Weekend longform"
                />
              </ListSection>
            </Surface>

            <Surface compact className="desktop-note">
              <p className="desktop-note__label">Why this matters</p>
              <p>
                Step 12 is about freezing a reusable display layer before shared types and the
                three-column reader start introducing real data.
              </p>
            </Surface>
          </SplitPane>

          <SplitPane>
            <Surface className="desktop-panel">
              <ListSection
                actions={
                  <Button size="sm" tone="ghost">
                    Filter
                  </Button>
                }
                description="The middle pane remains a visual stub backed by shared list affordances."
                title="Article queue"
              >
                <ListRow
                  active
                  eyebrow="Unread"
                  meta="7 min"
                  summary="UI package rows can already express metadata, emphasis and focus states."
                  title="Designing an offline-first RSS workspace without a monolith"
                />
                <ListRow
                  eyebrow="Starred"
                  meta="12 min"
                  summary="This remains sample content until Step 13 introduces shared domain types."
                  title="How shared-query will keep rules, search and smart folders aligned"
                />
                <ListRow
                  eyebrow="Saved"
                  meta="5 min"
                  summary="Desktop shell styling now depends on package tokens rather than bespoke globals."
                  title="Theme variables as the contract between app shells and design system"
                />
              </ListSection>
            </Surface>
          </SplitPane>

          <SplitPane>
            <Surface className="desktop-panel desktop-panel--reader">
              <div className="desktop-reader__meta">
                <span>Reader preview</span>
                <span>Offline-capable shell</span>
              </div>
              <h2 className="desktop-reader__title">
                The desktop host now demonstrates composition instead of owning presentation.
              </h2>
              <p className="desktop-reader__body">
                The right pane is still mock content, but its typography, spacing, and controls are
                now driven by reusable package tokens. That keeps the next step focused on data
                contracts rather than reworking local CSS into shared abstractions.
              </p>
              <p className="desktop-reader__body">
                Step 13 can now introduce shared DTOs and enums against a stable UI surface, while
                Step 15 can assemble the real three-column reader on top of the same primitives.
              </p>
              <div className="desktop-reader__toolbar">
                <Button tone="neutral">Mark as staged</Button>
                <Button tone="ghost">Export tokens</Button>
              </div>
            </Surface>
          </SplitPane>
        </SplitLayout>
      </main>
    </ThemeRoot>
  )
}

export default App
