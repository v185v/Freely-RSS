# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FreelyRSS is a local-first RSS reader built as a monorepo: desktop (Tauri v2 + React), web (read-only sync reader), mobile (Expo reading shell), sync server (Axum), shared TS packages, and Rust domain crates. The desktop SQLite database is the source of truth; remote sync uses encrypted event batches, not a database replica.

## Essential Commands

```bash
corepack pnpm install                    # Install dependencies
corepack pnpm run desktop:dev            # Vite dev server (frontend only)
corepack pnpm run desktop:tauri:dev      # Full Tauri desktop app
corepack pnpm run web:dev                # Web reader dev server
corepack pnpm run mobile:dev             # Expo mobile dev server
corepack pnpm run verify                 # Full CI check (run before PR)
```

### Testing

```bash
corepack pnpm run test:desktop           # Desktop vitest
corepack pnpm run test:web               # Web vitest
corepack pnpm run test:mobile            # Mobile vitest
corepack pnpm run test:rust              # Cargo test --workspace
corepack pnpm run test:config            # Shared config (node --test)
corepack pnpm run test:types             # Shared types type-check
corepack pnpm run test:query             # Shared query type-check + tests

# Single test file (desktop example)
cd apps/desktop && corepack pnpm test -- --run src/features/some-feature/some.test.ts

# Single Rust crate
cargo test -p freelyrss-core-domain
```

### Code Quality

```bash
corepack pnpm run format                 # Biome format (apply)
corepack pnpm run lint:fix               # Biome lint (fix)
corepack pnpm run rust:fmt               # Rust format
corepack pnpm run rust:clippy            # Rust static analysis
```

## Architecture

### Module Boundaries (Critical)

| Module | Owns | Must NOT do |
|--------|------|-------------|
| `apps/desktop` | Tauri host, SQLite init, reader queue, AI commands, local REST API | Remote sync service, Web/mobile duties |
| `apps/web` | Remote sync reader, read-only display | Local fetch, Tauri/SQLite, AI generation |
| `apps/mobile` | Expo reading shell, offline cache/media/sharing | Desktop batch ops, OPML, Tauri/SQLite |
| `apps/sync-server` | Axum encrypted sync API (login, device, events, blobs) | Business entity REST, plaintext payloads |
| `packages/ui` | React primitives, theme CSS | Business state, platform host logic |
| `packages/shared-types` | Cross-platform DTOs, enums, sync boundaries | Data access, runtime storage |
| `packages/shared-query` | Query AST, parser, validation, SQL planning | Rule execution, SQLite connection |
| `packages/shared-config` | Runtime defaults, env parsing, validation | Secret storage, remote config |
| `crates/core-domain` | Domain models, SQLite migrations, stores, FTS, backup/restore | HTTP fetch, UI state, remote routing |
| `crates/feed-engine` | Fetch, parse (RSS/Atom/JSON Feed/HTML), normalize, persist | Reader UI, sync protocol, AI tasks |
| `crates/rule-engine` | Query matching, action planning, audit | Direct UI operations |
| `crates/sync-engine` | Event batching, encryption, merge, replay, WebDAV storage | Business DB, UI view state |
| `crates/ai-adapter` | Provider trait, queue, mock provider, workflows | Auto-enable AI, rewrite originals |

### Desktop Frontend Stack

- TanStack Router for navigation
- React Query for server state
- Zustand for view state (theme, UI preferences)
- `desktop-bridge.ts` wraps Tauri invoke with mock fallback for dev/test
- Shared UI from `@freelyrss/ui`, shared types from `@freelyrss/shared-types`

### Database

SQLite schema v8 with FTS5, WAL mode, foreign keys, strict tables. Migrations live in `crates/core-domain/src/sqlite/migrations/` and are registered in `migrations.rs`. All schema changes must go through numbered migration files.

## Key Rules

1. **Always read `memory-bank/architecture.md` before writing code** — it has the full schema and data flow.
2. **No schema changes outside migrations** — never create business tables in host code or tests.
3. **Web and mobile are read-only** — no write operations, no local fetch, no Tauri/SQLite.
4. **AI is opt-in** — triggered by explicit UI action, results stored as `AIArtifact` (derived, deletable).
5. **Sync does not mirror desktop** — encrypted events only, server never sees plaintext business data.
6. **Update `memory-bank/architecture.md`** after adding a major feature or completing a milestone.

## Code Style

- Biome 1.9.4: 2-space indent, 100 char line width, double quotes, semicolons as-needed
- Rust: standard conventions, `cargo fmt` + `clippy -D warnings`
- Pre-commit hooks (lefthook): format check, lint, rust fmt, clippy
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`

## Key Reference Files

- `memory-bank/architecture.md` — current code structure, full DB schema, data flows, module boundaries
- `memory-bank/RSS-design-document.md` — product scope and design decisions
- `memory-bank/tech-stack.md` — technology choices and rationale
- `memory-bank/progress.md` — current state, verification entry points, known risks
- `docs/release-operations.md` — deployment, backup/restore, troubleshooting
