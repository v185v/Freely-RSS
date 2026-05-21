# FreelyRSS Release Operations Runbook

This runbook is the Step 85 release and operations reference for developers who
did not participate in the implementation work. It documents the commands and
runtime paths needed to build, verify, package, start, back up, restore, and
triage FreelyRSS from a clean checkout.

Source references:

- Product and architecture source of truth:
  [memory-bank/RSS-design-document.md](../memory-bank/RSS-design-document.md) and
  [memory-bank/architecture.md](../memory-bank/architecture.md)
- Workspace scripts: [package.json](../package.json)
- Desktop storage layout:
  [apps/desktop/src-tauri/src/storage.rs](../apps/desktop/src-tauri/src/storage.rs)
- Sync server entry point:
  [apps/sync-server/src/main.rs](../apps/sync-server/src/main.rs)

## Scope

This document covers release operations only. It does not define new product
scope, synchronization protocol behavior, AI provider behavior, mobile native
distribution credentials, or hosted infrastructure automation.

## Prerequisites

- Node.js 22 or newer.
- Corepack enabled so the workspace uses `pnpm@10.33.0`.
- Rust stable with `rustfmt` and `clippy`.
- Platform prerequisites required by Tauri v2 for the target operating system.
- For mobile simulator runs, install the Expo and platform simulator toolchain.
- For desktop package signing or notarization, prepare platform signing assets
  outside this repository.

## Fresh Checkout Bootstrap

Run these commands from the repository root:

```powershell
corepack enable
corepack pnpm install
corepack pnpm run verify
```

`corepack pnpm run verify` is the main repository gate. It checks format, lint,
shared package tests, desktop tests, Web tests, mobile tests, Web build, mobile
type checking, Rust format, Rust clippy, Rust workspace tests, Markdown links,
and this release operations document.

## Build and Startup Flow

Use the smallest command that matches the surface being exercised.

| Surface | Start command | Build or check command | Notes |
| --- | --- | --- | --- |
| Desktop Web shell | `corepack pnpm run desktop:dev` | `corepack pnpm run desktop:build` | Runs the Vite desktop frontend without native Tauri host packaging. |
| Desktop Tauri shell | `corepack pnpm run desktop:tauri:dev` | `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` | Use the no-bundle command as the fast native packaging validation before installer work. |
| Web reader | `corepack pnpm run web:dev` | `corepack pnpm run web:build` | Runs and builds the synchronized Web reader entry. |
| Mobile reader | `corepack pnpm run mobile:dev` | `corepack pnpm run mobile:check` | Use `corepack pnpm run test:mobile` for mobile regression tests. |
| Sync server | `cargo run -p freelyrss-sync-server` | `cargo build -p freelyrss-sync-server --release` | Defaults to `127.0.0.1:4080`; override with `FREELYRSS_SYNC_BIND_ADDR`. |

To start the sync server on a different local port in PowerShell:

```powershell
$env:FREELYRSS_SYNC_BIND_ADDR = "127.0.0.1:4090"
cargo run -p freelyrss-sync-server
```

## Verification Gates

Before a release branch or build candidate is accepted, run:

```powershell
corepack pnpm run verify
```

Use targeted commands only while isolating a failure:

```powershell
corepack pnpm run format:check
corepack pnpm run lint
corepack pnpm run test:desktop
corepack pnpm run test:web
corepack pnpm run test:mobile
corepack pnpm run web:build
corepack pnpm run mobile:check
corepack pnpm run rust:fmt:check
corepack pnpm run rust:clippy
corepack pnpm run test:rust
corepack pnpm run docs:links
corepack pnpm run docs:release
```

Rust package-specific checks are useful when a single crate changed:

```powershell
cargo test -p freelyrss-core-domain
cargo test -p freelyrss-feed-engine
cargo test -p freelyrss-sync-engine
cargo test -p freelyrss-performance-baseline
cargo clippy -p freelyrss-performance-baseline --all-targets -- -D warnings
```

## Packaging

Desktop release candidates use the Tauri bundler:

```powershell
corepack pnpm run desktop:tauri:build
```

Expected desktop bundle output is under:

```text
apps/desktop/src-tauri/target/release/bundle/
```

Use this command for a faster native validation that avoids installer bundle
generation:

```powershell
corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle
```

Web build artifacts are generated under:

```text
apps/web/dist/
```

Desktop frontend artifacts are generated under:

```text
apps/desktop/dist/
```

The sync server release binary is built with:

```powershell
cargo build -p freelyrss-sync-server --release
```

The binary is emitted under `target/release/` with the platform executable
suffix, for example `freelyrss-sync-server.exe` on Windows.

Mobile release packaging is intentionally not automated in this repository yet.
The current release gate is `corepack pnpm run mobile:check` plus
`corepack pnpm run test:mobile`; platform store builds should be added through
Expo EAS or native platform build pipelines when signing credentials exist.

## Runtime Data Layout

The desktop application resolves its base data directory through Tauri
`app.path().app_local_data_dir()`. Do not hard-code this base path in product
logic or release scripts. The operating system and Tauri identifier decide the
absolute location.

Within that base directory, FreelyRSS owns this layout:

| Relative path | Purpose | Backup priority |
| --- | --- | --- |
| `database/freelyrss.sqlite3` | Main local SQLite database. | Required. |
| `database/freelyrss.sqlite3-wal` | SQLite WAL sidecar when present. | Required with a live copy. |
| `database/freelyrss.sqlite3-shm` | SQLite shared-memory sidecar when present. | Required with a live copy. |
| `database/backups/` | Migration and manual SQLite backup snapshots. | Required for rollback. |
| `cache/content/` | Extracted or cached article content. | Optional but useful for offline restore. |
| `cache/media/` | Cached media and podcast attachments. | Optional and can be large. |
| `exports/` | User export output from local export flows. | Back up if user treats exports as canonical. |
| `logs/` | Desktop log file directory. | Useful for support, not required for restore. |

Repository checkout directories, `apps/**/dist`, `apps/**/src-tauri/target`,
and root `target` are build outputs, not runtime user data.

## Backup and Restore

Automatic migration backups are created when a non-empty existing database has
pending migrations and the desktop storage layer supplies `database/backups/` as
the backup directory. Backup names follow this shape:

```text
freelyrss-schema-v<current>-to-v<target>-<unix_timestamp>.sqlite3
```

For a manual backup, close FreelyRSS first whenever possible. Then create a
SQLite snapshot with `VACUUM INTO` or copy the database plus WAL sidecars as a
consistent set.

Example manual snapshot:

```powershell
sqlite3 "<base-data-dir>/database/freelyrss.sqlite3" "VACUUM INTO '<base-data-dir>/database/backups/manual-YYYYMMDD-HHMMSS.sqlite3';"
```

Restore procedure:

1. Close every running FreelyRSS desktop process.
2. Copy the current `database/freelyrss.sqlite3`, `database/freelyrss.sqlite3-wal`,
   and `database/freelyrss.sqlite3-shm` files to a separate quarantine directory
   if they exist.
3. Replace `database/freelyrss.sqlite3` with the selected backup snapshot.
4. Remove stale `database/freelyrss.sqlite3-wal` and
   `database/freelyrss.sqlite3-shm` files.
5. Start FreelyRSS and let the normal migration bootstrap run.
6. If the restored database starts correctly, restore `cache/content`,
   `cache/media`, and `exports` only when those artifacts are needed.

The Rust helper `restore_database_from_backup` implements the same core file
replacement and sidecar cleanup logic for future host commands, but no
end-user restore command is exposed yet.

## Logs

Desktop storage creates a `logs/` directory inside the Tauri app local data
directory. The current desktop shell does not yet write rotating log files by
default, so an empty `logs/` directory is expected in development builds.

During desktop development, inspect:

- The terminal that runs `corepack pnpm run desktop:tauri:dev`.
- The Vite terminal for `corepack pnpm run desktop:dev`.
- The browser or WebView developer console when investigating frontend runtime
  errors.

The sync server writes startup and error information to stdout and stderr. The
default startup line is:

```text
freelyrss sync server listening on http://127.0.0.1:4080
```

Production service managers should capture stdout and stderr at the host level
until structured server logging is added.

## Troubleshooting

| Symptom | Check | Recovery |
| --- | --- | --- |
| `pnpm` or workspace scripts are not found. | `corepack enable` was not run or Node.js is too old. | Install Node.js 22 or newer, run `corepack enable`, then rerun `corepack pnpm install`. |
| Dependency install differs across machines. | Lockfile or pnpm version drift. | Use `corepack pnpm install --frozen-lockfile` on release machines. |
| Desktop frontend builds but Tauri dev fails. | Native Tauri prerequisites or Rust toolchain missing. | Install platform Tauri prerequisites, then run `cargo check --workspace` and `corepack pnpm run desktop:tauri:dev`. |
| Desktop opens a blank shell. | Frontend runtime error or stale build output. | Run `corepack pnpm run desktop:build`, restart the Tauri dev command, and inspect the WebView console. |
| Database is locked. | Another FreelyRSS or sqlite process is holding the database. | Close all app instances and sqlite shells; keep WAL sidecars with the database when copying live data. |
| Migration fails after an upgrade. | Pending migration error or interrupted write. | Stop the app, restore the most recent `database/backups/` snapshot, remove stale WAL sidecars, and rerun the app. |
| Search returns stale or missing results. | FTS trigger or migration failure. | Run the Rust workspace tests; if the user database is affected, restore from backup before retrying migration. |
| Sync server will not start. | Port `127.0.0.1:4080` is already in use. | Set `FREELYRSS_SYNC_BIND_ADDR` to a free loopback address and restart. |
| Markdown link validation fails. | A local Markdown link points at a missing file. | Run `corepack pnpm run docs:links` and fix the reported file and line. |
| Release operations doc validation fails. | A required Step 85 topic or command was removed. | Run `corepack pnpm run docs:release` and restore the missing section or command. |
| Vite reports a large chunk warning. | The desktop bundle currently emits a known warning. | Treat it as a warning unless the build exits non-zero. |

## Release Checklist

Use this checklist before creating a release tag or distributing artifacts:

1. Re-read [memory-bank/progress.md](../memory-bank/progress.md) and confirm the
   current step and handoff notes match the release candidate.
2. Run `corepack pnpm install --frozen-lockfile` in a clean checkout.
3. Run `corepack pnpm run verify`.
4. Run `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle`.
5. For installer artifacts, run `corepack pnpm run desktop:tauri:build`.
6. For sync-server artifacts, run `cargo build -p freelyrss-sync-server --release`.
7. Run `corepack pnpm run changeset:status` and confirm package version notes
   before publishing.
8. Record any known release caveats in `memory-bank/progress.md` before handing
   off to another developer.
