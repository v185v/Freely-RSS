# Changesets

This directory defines how FreelyRSS versions the JS/TS workspace under `apps/*`
and `packages/*`.

## Scope

- `apps/desktop`, `apps/web`, and `apps/mobile` are treated as client release
  lines. Each app keeps its own package version.
- `packages/ui`, `packages/shared-types`, `packages/shared-query`, and
  `packages/shared-config` are shared contract packages. Bump them when their
  exported API, runtime behavior, or generated assets change.
- Rust crate versions, sync protocol versions, and SQLite schema versions are
  not derived from Changesets. They are tracked separately in Rust manifests,
  protocol constants, and migration history.

## Workflow

1. Run `corepack pnpm run changeset:add` when a change affects one or more JS/TS
   workspace packages.
2. Choose the impacted packages and bump type (`patch`, `minor`, or `major`).
3. Write a user-facing summary. Keep it short and release-note ready.
4. Validate the release plan with `corepack pnpm run changeset:status`.
5. Generate version bumps and changelog drafts with
   `corepack pnpm run changeset:version`.

## When A Changeset Is Required

- Required: behavior changes, public contract changes, new commands, package
  metadata changes that affect delivery, or any work that should appear in a
  package changelog.
- Usually not required: memory-bank-only updates, Rust-only internal work, or
  repo chores that do not affect a JS/TS workspace package release line.

## Example

```md
---
"@freelyrss/desktop": patch
"@freelyrss/ui": minor
---

Add the initial desktop shell and shared layout primitives.
```

Reference docs: <https://github.com/changesets/changesets>
