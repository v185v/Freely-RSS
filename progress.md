# Progress Log

## 2026-04-06

- Reviewed repository instructions in `AGENTS.md`.
- Listed all files in `memory-bank/`.
- Read `memory-bank/RSS-design-document.md`.
- Read `memory-bank/tech-stack.md`.
- Confirmed `memory-bank/architecture.md` is empty.
- Confirmed `memory-bank/progress.md` is empty.
- Started drafting the implementation plan structure and sequencing.
- Created internal planning files: `task_plan.md`, `findings.md`, `progress.md`.
- Wrote `memory-bank/implementation-plan.md`.
- Verified that `memory-bank/implementation-plan.md` contains 86 steps and that each step includes a validation test.

## 2026-04-21

- Reviewed every file in `memory-bank/` and re-read `memory-bank/progress.md` to resume from the latest completed milestone.
- Confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 5 Step 40: extracted-content and original-content reader modes.
- Implemented a persisted reader content-mode preference in `apps/desktop/src/features/reader-shell/state.ts` and threaded it through the desktop reader shell.
- Updated `apps/desktop/src/features/reader-shell/components/reader-pane.tsx` to expose explicit mode toggles, render extracted content separately from original source content, and preserve clean empty-state behavior when one representation is missing.
- Expanded mock reader-shell fixtures in `apps/desktop/src/features/reader-shell/mock-data.ts` so Step 40 visibly changes the reader output before the later extraction-pipeline milestone.
- Added regression coverage in `apps/desktop/src/features/reader-shell/reader-shell.test.tsx` for mode switching and reopening the app with the latest mode preserved.
- Verified the work with `corepack pnpm --filter @freelyrss/desktop test`, `corepack pnpm run desktop:build`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 40 implementation record, architectural insights, and file-responsibility notes for the next developer.

## 2026-04-22

- Reviewed every file in `memory-bank/` and re-read both `memory-bank/progress.md` and root `progress.md` to resume from the latest completed milestone.
- Confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 5 Step 46: highlights and annotations.
- Implemented paragraph-scoped extracted-text annotation anchors and shell-side highlight and note creation in the desktop reader shell.
- Updated `apps/desktop/src/features/reader-shell/types.ts`, `apps/desktop/src/features/reader-shell/mock-data.ts`, `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`, `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`, `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`, and `apps/desktop/src/styles.css` for annotation authoring, replay, and regression coverage.
- Verified the work with `corepack pnpm run format`, `corepack pnpm --filter @freelyrss/desktop test`, `corepack pnpm run desktop:build`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 46 implementation record, architectural boundary notes, and per-file responsibility details for the next developer.
- Re-reviewed every file in `memory-bank/` and confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 5 Step 47: unified query expression parsing and validation.
- Implemented richer `shared-query` parsing and validation in `packages/shared-query/src/text-query.ts`, `packages/shared-query/src/serialize.ts`, `packages/shared-query/src/errors.ts`, `packages/shared-query/src/index.ts`, and `packages/shared-query/test/query.test.mjs`, including grouped expressions, explicit operators, positioned parse errors, and structural JSON validation.
- Updated `apps/desktop/src/features/reader-shell/article-query.ts`, `apps/desktop/src/features/reader-shell/types.ts`, `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`, `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`, `apps/desktop/src/features/reader-shell/reader-shell.test.tsx`, and `apps/desktop/src/styles.css` so the queue filter now consumes the shared parser, shows parser feedback, and preserves the route-backed queue on invalid text input.
- Verified the work with `corepack pnpm run format`, `corepack pnpm --filter @freelyrss/shared-query check`, `corepack pnpm --filter @freelyrss/shared-query test`, `corepack pnpm --filter @freelyrss/desktop test`, `corepack pnpm run desktop:build`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 47 implementation record, architectural boundary notes, and per-file responsibility details for the next developer.

## 2026-04-23

- Reviewed every file in `memory-bank/` and re-read both `memory-bank/progress.md` and root `progress.md` to resume from the latest completed milestone.
- Confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 5 Step 49: rule action execution.
- Implemented typed rule-action parsing and command planning in `crates/rule-engine/src/actions.rs`, including controlled support for `readState`, `starred`, `readLater`, `importance`, `tagNames`, `moveToFolderId`, `clearCachedAttachments`, and explicit `{ "type": "noop" }` compatibility.
- Updated `crates/rule-engine/src/error.rs`, `crates/rule-engine/src/lib.rs`, and `crates/rule-engine/src/engine.rs` so the rule engine now exposes action validation issues, explicit command-plan types, and a combined `execute_rule()` entry point that validates actions, reuses Step 48 matching, and emits state-aware commands without touching SQLite.
- Added regression coverage in `crates/rule-engine/src/actions.rs` and `crates/rule-engine/src/engine.rs` for valid action parsing, invalid action payloads, matched-rule command planning, and no-op collapse when the current snapshot already satisfies the requested actions.
- Verified the work with `cargo test -p freelyrss-rule-engine`, `cargo clippy -p freelyrss-rule-engine --all-targets -- -D warnings`, `cargo fmt --all --check`, `corepack pnpm run verify`, `corepack pnpm run desktop:build`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `progress.md`, `memory-bank/progress.md`, and `memory-bank/architecture.md` with the Step 49 implementation record, verification results, architectural insights, and per-file responsibility details for the next developer.
- Re-reviewed every file in `memory-bank/`, confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 5 Step 50: rule audit history, and kept the existing boundary split between `crates/rule-engine` command planning and `crates/core-domain` durable storage.
- Implemented durable rule-audit domain and SQLite support in `crates/core-domain/src/model/automation.rs`, `crates/core-domain/src/model/enums.rs`, `crates/core-domain/src/model/ids.rs`, `crates/core-domain/src/sqlite/migrations.rs`, `crates/core-domain/src/sqlite/migrations/007_rule_audit_history.sql`, `crates/core-domain/src/sqlite/records.rs`, `crates/core-domain/src/sqlite/rule_audit_store.rs`, and `crates/core-domain/src/sqlite/mod.rs`, adding the `RuleAudit` entity, `RuleAuditMatchResult`, `RuleAuditId`, a dedicated `RuleAudit` table plus indexes, migration coverage, and store APIs for recording history and attaching later applied effects.
- Added rule-engine audit serialization in `crates/rule-engine/src/audit.rs` and updated `crates/rule-engine/src/engine.rs` and `crates/rule-engine/src/lib.rs` so enabled rule evaluations now produce audit-ready input snapshots and planned-command payloads while `execute_rule()` keeps its existing action-plan API.
- Added regression coverage for matched and non-matched audit generation, record round-tripping, migration upgrades to schema v7, rule-audit history reads, and applied-effects updates without rewriting planned commands.
- Verified the Step 50 work with `cargo test -p freelyrss-rule-engine`, `cargo test -p freelyrss-core-domain`, `cargo clippy -p freelyrss-rule-engine -p freelyrss-core-domain --all-targets -- -D warnings`, `cargo fmt --all`, `corepack pnpm run verify`, `corepack pnpm run desktop:build`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `progress.md`, `memory-bank/progress.md`, and `memory-bank/architecture.md` with the Step 50 implementation record, schema changes, architectural insights, and per-file responsibility notes for the next developer.

## 2026-04-25

- Reviewed every file in `memory-bank/` and re-read both `memory-bank/progress.md` and root `progress.md` to resume from the latest completed milestone.
- Confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 6 Step 53: search-hit highlighting.
- Added a shared queue-search presentation path in `apps/desktop/src/features/reader-shell/search-highlighting.tsx` so the desktop shell can derive positive content-search terms from shared-query ASTs, build mock-memory snippets, and render `<mark>`-style queue highlights without using unsafe HTML injection.
- Updated `apps/desktop/src/features/reader-shell/article-query.ts`, `apps/desktop/src/features/reader-shell/types.ts`, `apps/desktop/src/features/reader-shell/components/queue-pane.tsx`, `apps/desktop/src/features/reader-shell/components/reader-pane.tsx`, `apps/desktop/src/features/reader-shell/reader-shell-route.tsx`, `apps/desktop/src/features/reader-shell/mock-data.ts`, and `apps/desktop/src/styles.css` so memory execution now attaches `searchSnippet` DTO data, the queue renders search-hit snippets, and the reading panel highlights current body matches while preserving existing annotation replay.
- Extended shared DTO and UI primitives in `packages/shared-types/src/article.ts` and `packages/ui/src/components/list.tsx` so queue rows can carry nullable `searchSnippet` data and render rich summary content without forking a shell-only row component.
- Updated the durable backend in `crates/core-domain/src/sqlite/article_search_store.rs` and `apps/desktop/src-tauri/src/reader_queue.rs` so SQLite article listing now returns best-column FTS snippets and the Tauri queue command forwards them through the existing `ArticleListItemDto` contract.
- Added regression coverage in `apps/desktop/src/features/reader-shell/reader-shell.test.tsx` for body-only search hits reaching both queue snippets and reader highlights, plus Rust coverage for durable snippet propagation in `crates/core-domain` and `apps/desktop/src-tauri`.
- Verified the Step 53 work with `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`, `cargo test -p freelyrss-core-domain article_search_store`, `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`, `corepack pnpm run format`, `cargo fmt --all`, `corepack pnpm run desktop:build`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `progress.md`, `memory-bank/progress.md`, and `memory-bank/architecture.md` with the Step 53 implementation record, verification results, architectural boundary notes, and per-file responsibility details for the next developer.

## 2026-04-27

- Reviewed every file in `memory-bank/` again and confirmed the next implementation target was `memory-bank/implementation-plan.md` Stage 7 Step 54: cache policy configuration.
- Continued from the existing partial Step 54 worktree instead of restarting it, verified the root cause of the broken build, and found that cache-policy wiring had reached shared config and SQLite/domain layers but had not yet been finished in the desktop shell mock/data path.
- Completed the shared cache-policy contract by keeping runtime-wide cache defaults in `packages/shared-config`, adding the `CachePolicy` enum and `FeedDto.cachePolicy` field in `packages/shared-types`, and finishing the durable feed-side schema update in `crates/core-domain` with migration `008_feed_cache_policy.sql`.
- Updated `apps/desktop/src/features/reader-shell/mock-data.ts` so every mock feed carries an explicit cache policy, the shell snapshot exposes `cacheSettings`, feed edits can persist `cachePolicy`, and imported OPML feeds inherit the current desktop default policy instead of inventing a separate import-only default.
- Added `apps/desktop/src/features/reader-shell/cache-policy.ts` to centralize cache-policy labels and MB/bytes conversions, added `components/cache-settings-card.tsx` for desktop-wide cache defaults, and extended `components/feed-editor-card.tsx` so per-feed cache rules are edited beside existing source metadata.
- Updated `components/source-pane.tsx`, `reader-shell-route.tsx`, `types.ts`, and `styles.css` so the left pane now hosts both global cache settings and feed-level cache policy editing through separate shell mutation paths without blending those controls into queue/search state.
- Added regression coverage in `apps/desktop/src/features/reader-shell/reader-shell.test.tsx` for both per-feed cache-policy persistence and global cache-settings persistence, including verification that newly imported feeds inherit the active desktop default policy.
- Fixed the stale migration expectation in `crates/core-domain/src/sqlite/mod.rs` so the upgrade test from schema v6 now correctly expects both pending migrations (`v7` and `v8`) to apply in sequence.
- Verified the Step 54 work with `corepack pnpm run desktop:build`, `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`, `corepack pnpm run test:config`, `cargo test -p freelyrss-core-domain`, `corepack pnpm run format`, `cargo fmt --all`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `progress.md`, `memory-bank/progress.md`, and `memory-bank/architecture.md` with the Step 54 implementation record, architectural boundary notes, verification results, and per-file responsibility details for the next developer.

## 2026-04-29

- Reviewed every file in `memory-bank/` and resumed from `memory-bank/progress.md`, which identified `memory-bank/implementation-plan.md` Stage 7 Step 56 as the next implementation target.
- Implemented a dedicated Markdown export boundary in `apps/desktop/src/features/reader-shell/markdown-export.ts` for selected-article and visible-queue export, preserving metadata, body text, annotations, anchors, and attachment references.
- Added shell-level export contracts in `apps/desktop/src/features/reader-shell/types.ts`, mock export resolution in `mock-data.ts`, route mutation wiring in `reader-shell-route.tsx`, and presentation-only controls in `components/markdown-export-card.tsx` composed by `components/reader-pane.tsx`.
- Added focused unit coverage in `markdown-export.test.ts` plus reader-shell flow coverage in `reader-shell.test.tsx`.
- Verified the Step 56 work with `corepack pnpm --filter @freelyrss/desktop test -- --run markdown-export.test.ts reader-shell.test.tsx`, `corepack pnpm run format`, `corepack pnpm run desktop:build`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 56 implementation record, verification results, architectural insights, and per-file responsibility notes for the next developer.

## 2026-05-16

- Reviewed all files in `memory-bank/` and resumed from `memory-bank/progress.md`, which identified Stage 10 Step 74 as the next implementation target: summary and keyword extraction.
- Implemented the Step 74 article insight workflow in `crates/ai-adapter`, using `AiTaskQueue` and `AiProviderRegistry` to generate summary and keyword `AIArtifact` values without exposing provider calls to the reader UI.
- Added `AIArtifactStore` in `crates/core-domain` for upserting and listing completed artifacts from the existing `AIArtifact` table; no database migration or parallel AI result schema was added.
- Added the desktop Tauri command `generate_article_insights` in `apps/desktop/src-tauri`, including SQLite article loading, existing artifact cache seeding, mock local provider execution, persistence, DTO mapping, and UTC ISO created-at timestamps.
- Extended shared/article detail DTOs and the desktop reader shell so `Generate insights` is an explicit user action, artifacts render in the reading panel, task status tracks the run, and browser-only development uses a mock fallback.
- Added tests for adapter workflow/cache reuse, SQLite artifact store persistence, Tauri generation/persistence/cache reuse, and reader UI generation after switching away and back to the article.
- Verified the Step 74 work with `cargo test -p freelyrss-ai-adapter`, `cargo test -p freelyrss-core-domain ai_artifact_store`, `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml ai_insights`, `cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings`, `corepack pnpm --filter @freelyrss/desktop test -- --run reader-shell.test.tsx`, `corepack pnpm --filter @freelyrss/shared-types check`, `corepack pnpm run desktop:build`, `corepack pnpm run verify`, and `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
- Browser-checked the local desktop web shell at `http://localhost:1420/`; the AI panel rendered and `Generate insights` produced the expected summary, keywords, and provider metadata. The only console error observed was the existing missing `favicon.ico` 404.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 74 implementation record, validation notes, file responsibilities, and Stage 10 Step 75 handoff.

## 2026-05-20

- Reviewed every file in `memory-bank/` and resumed from `memory-bank/progress.md`, whose latest tail record identified Stage 11 Step 78 as the next implementation target: keep the Web entry inside the remote synchronized-data boundary.
- Added `apps/web/src/web-scope.ts` to define the Web allowed-operation list, deferred desktop/out-of-scope operation list, initial requirement ledger, and summary validation.
- Updated `apps/web/src/remote-client.ts` so the synchronized reader snapshot now includes the Web scope contract and summary while remaining a read-only remote facade.
- Updated `apps/web/src/web-app.tsx` so article detail loading goes through `fetchRemoteArticleDetail`, scope violations stop normal rendering, and `data-scope-mode` / `data-scope-blockers` expose the active contract for non-visual diagnostics.
- Added `apps/web/src/web-scope.test.ts` and extended `apps/web/src/web-app.test.tsx` to prove the initial Web scope has no blockers, desktop-only capabilities stay deferred, the remote client only exposes read functions, and the UI does not render desktop-only controls.
- Verified the Step 78 work with `corepack pnpm --filter @freelyrss/web test`, `corepack pnpm --filter @freelyrss/web build`, `corepack pnpm run format:check`, `corepack pnpm run lint`, `corepack pnpm run verify`, and `corepack pnpm run docs:links`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 78 implementation record, validation notes, architecture insights, file responsibilities, and Stage 11 Step 79 handoff.

## 2026-05-21

- Reviewed every file in `memory-bank/` and resumed from `memory-bank/progress.md`, whose latest record identified Stage 12 Step 82 as the next implementation target: desktop end-to-end reader regression coverage.
- Added `apps/desktop/src/features/reader-shell/desktop-offline-reader.e2e.test.tsx` to cover the desktop shell path for adding a source through OPML import, manually refreshing it, opening the fetched article, changing local article state, searching deterministic content, and exporting Markdown plus HTML.
- Updated `apps/desktop/src/features/reader-shell/mock-data.ts` so refreshing an empty imported feed creates one deterministic mock article/detail pair for the E2E path without adding network, Tauri, SQLite, sync, or parser-fixture dependencies.
- Verified the Step 82 work with `corepack pnpm --filter @freelyrss/desktop test -- src/features/reader-shell/desktop-offline-reader.e2e.test.tsx`, `corepack pnpm run desktop:build`, `corepack pnpm run format:check`, `corepack pnpm run lint`, and `corepack pnpm run verify`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 82 implementation record, validation notes, architecture insights, per-file responsibilities, and Stage 12 Step 83 handoff.
- Re-read all `memory-bank/` files and resumed from Stage 12 Step 83: sync concurrency testing.
- Added `crates/sync-engine/tests/concurrency.rs` to simulate repeated multi-device concurrent article-state synchronization across `UserState`, `Annotation`, and `ArticleTag` events.
- The new regression sends merge out-of-order per-device batches, sends replay cursor-ordered batches with multiple page sizes, repeats duplicate deliveries, and asserts both paths converge to the same final article projection and cursor.
- Verified the Step 83 work with `cargo test -p freelyrss-sync-engine concurrent_article_batches_converge_across_merge_and_replay_runs`, `cargo test -p freelyrss-sync-engine`, `cargo fmt --all --check`, `cargo clippy -p freelyrss-sync-engine --all-targets -- -D warnings`, and `corepack pnpm run verify`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 83 implementation record, validation notes, architecture insights, related file responsibilities, and Stage 12 Step 84 handoff.
- Re-read all `memory-bank/` files and resumed from Stage 12 Step 84: performance baseline coverage.
- Added `crates/performance-baseline` as a dedicated test crate for fixed large-library budgets across SQLite/FTS, content extraction, and feed ingestion.
- The Step 84 regression seeds 100 feeds and 10,000 articles, then measures startup/open, 120-row queue windows, 2000-hit FTS search, 1000-article bulk mark-read, text payload size, 25-document extraction, and 100-feed cold fetch throughput.
- Verified the Step 84 work with `cargo test -p freelyrss-performance-baseline`, `cargo fmt --all --check`, `cargo clippy -p freelyrss-performance-baseline --all-targets -- -D warnings`, `cargo test -p freelyrss-performance-baseline -- --nocapture`, and `corepack pnpm run verify`.
- Updated `memory-bank/progress.md` and `memory-bank/architecture.md` with the Step 84 implementation record, observed metrics, architecture insights, file responsibilities, and Stage 12 Step 85 handoff.
