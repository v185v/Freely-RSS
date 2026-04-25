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
