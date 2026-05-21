# FreelyRSS

FreelyRSS is a local-first RSS reader workspace for people who want to collect,
filter, read, search, annotate, export, and sync their feeds without making a
cloud account the center of the product.

The project is still an early preview. The desktop shell, domain model, local
SQLite storage, feed parsing, sync boundaries, AI task boundaries, Web reader
entry, and mobile reading shell are present, but production distribution,
signing, hosted sync, real AI providers, and store-ready mobile builds are still
future work.

## What It Is

- Local-first desktop reader built with Tauri, React, TypeScript, Rust, and
  SQLite.
- RSS / Atom / JSON Feed parsing and normalization through Rust crates.
- Full-text search backed by SQLite FTS5.
- Optional sync architecture based on encrypted events, not a remote mirror of
  the local database.
- Optional AI adapter boundary where generated artifacts are cached as derived
  data and can be disabled.
- Web and mobile surfaces that are intentionally narrower than the desktop app.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `apps/desktop` | Main Tauri desktop application and React reader shell. |
| `apps/web` | Remote synchronized Web reader entry. |
| `apps/mobile` | Expo / React Native reading-first shell. |
| `apps/sync-server` | Minimal Axum encrypted sync API. |
| `packages/ui` | Shared React UI primitives and theme CSS. |
| `packages/shared-types` | Cross-platform DTOs, ids, enums, and sync boundaries. |
| `packages/shared-query` | Shared query AST, parser, validation, and SQL planning. |
| `packages/shared-config` | Runtime defaults and environment parsing. |
| `crates/*` | Rust domain, feed, content, rule, sync, integration, AI, search, and performance crates. |
| `memory-bank` | Product, architecture, implementation, and progress notes. |
| `docs` | Release and operations documentation. |

## Prerequisites

- Node.js 22 or newer.
- Corepack enabled, using the pinned `pnpm@10.33.0`.
- Rust stable with `rustfmt` and `clippy`.
- Tauri v2 platform prerequisites for your operating system.
- Expo tooling only when working on the mobile shell.

## Bootstrap

```powershell
corepack enable
corepack pnpm install
corepack pnpm run verify
```

`corepack pnpm run verify` is the main repository gate. It checks formatting,
lint, shared package tests, desktop tests, Web tests, mobile tests, Web build,
mobile type checking, Rust formatting, Rust clippy, Rust tests, Markdown links,
and release runbook coverage.

## Development

```powershell
corepack pnpm run desktop:dev
corepack pnpm run desktop:tauri:dev
corepack pnpm run web:dev
corepack pnpm run mobile:dev
cargo run -p freelyrss-sync-server
```

Use the smallest command that matches the surface you are changing. Desktop UI
work often only needs `desktop:dev`; native storage, local API, and Tauri command
work should use `desktop:tauri:dev`.

## Build

```powershell
corepack pnpm run desktop:build
corepack pnpm run desktop:tauri:build
corepack pnpm run web:build
corepack pnpm run mobile:check
cargo build -p freelyrss-sync-server --release
```

Desktop bundle output is created under:

```text
apps/desktop/src-tauri/target/release/bundle/
```

For a faster native desktop validation without generating installers:

```powershell
corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle
```

## GitHub Actions

This repository has two workflow layers:

- [CI](./.github/workflows/ci.yml) runs documentation checks and workspace
  verification on pushes and pull requests.
- [Release Build](./.github/workflows/release-build.yml) builds desktop bundles
  on every push and uploads them as workflow artifacts. When the push is to
  `main`, it creates or updates a GitHub prerelease named `build-<short-sha>` and
  uploads the generated desktop artifacts.

Release builds are unsigned by default. Platform signing, notarization, hosted
sync deployment, and mobile app store builds require separate credentials and
are not automated in this repository yet.

## Documentation

- [Product design](./memory-bank/RSS-design-document.md)
- [Current architecture](./memory-bank/architecture.md)
- [Current progress](./memory-bank/progress.md)
- [Release operations](./docs/release-operations.md)
- [Technology stack](./memory-bank/tech-stack.md)

## Privacy Model

The core reader is designed to work without an account. Local data lives in the
desktop application's local data directory, and optional online features are
intended to be explicitly enabled. AI output is treated as derived data stored in
`AIArtifact`, not as a replacement for original article content.

## Contributing

This project uses Conventional Commits. Before opening a pull request, run:

```powershell
corepack pnpm run verify
```

Keep changes modular. New database tables, fields, indexes, or FTS structures
must be introduced through numbered SQL migrations in
`crates/core-domain/src/sqlite/migrations/` and registered in the embedded
migration list.

## License

MIT. See [LICENSE](./LICENSE).
