# Repository Guidelines

## Project Structure & Module Organization

This repository is currently documentation-first. Active project documents live in `memory-bank/`:

- `memory-bank/RSS-design-document.md`: product and architecture baseline
- `memory-bank/tech-stack.md`: recommended implementation stack

Until the application is scaffolded, keep planning, architecture, and implementation notes in `memory-bank/`. When code is introduced, align with the proposed structure from `tech-stack.md`:

- `apps/` for runnable clients and services
- `packages/` for shared TypeScript code
- `crates/` for shared Rust modules

# IMPORTANT:
# Always read memory-bank/@architecture.md before writing any code. Include entire database schema.
# Always read memory-bank/@RSS-design-document.md before writing any code.
# After adding a major feature or completing a milestone, update memory-bank/@architecture.md.

## Build, Test, and Development Commands

Current repository-level commands:

- `corepack pnpm install` : install JS/TS workspace dependencies and sync hooks
- `corepack pnpm run format` : apply Biome formatting
- `corepack pnpm run format:check` : run Biome formatting checks
- `corepack pnpm run lint` : run Biome lint rules
- `corepack pnpm run rust:fmt:check` : check Rust formatting
- `corepack pnpm run rust:clippy` : run Rust static analysis
- `corepack pnpm run test:rust` : run Rust workspace tests
- `corepack pnpm run verify` : run the full repository verification chain
- `corepack pnpm run changeset:add` : create a new workspace changeset
- `corepack pnpm run changeset:status` : preview package version bumps and release notes plan
- `corepack pnpm run changeset:version` : apply version bumps and generate package changelogs

There is not yet an application build or run command for `apps/desktop`, `apps/web`, or `apps/mobile`. Add those here when the app shells are scaffolded.

## Coding Style & Naming Conventions

- Use UTF-8 for all Markdown and source files.
- Prefer concise, descriptive filenames; use kebab-case for new docs where practical.
- Keep Markdown sections short, scannable, and action-oriented.
- For future code:
  - TypeScript: `camelCase` for variables/functions, `PascalCase` for components/types
  - Rust: standard Rust naming conventions and `snake_case` modules
- Use project-standard formatters once configured; avoid mixing overlapping tools.
- Ensure they emphasize modularity (multiple files) and discourage a monolith (one giant file). 

## Testing Guidelines

There is no automated test suite yet. For now:

- Validate new documents for accuracy, internal consistency, and path correctness.
- Cross-check new planning files against `RSS-design-document.md` and `tech-stack.md`.
- When tests are added, document the framework, command, and minimum coverage expectations here.

## Commit & Pull Request Guidelines

There is no established Git history in this workspace yet. Adopt Conventional Commits:

- `docs: add contributor guide`
- `feat: scaffold desktop app`
- `chore: configure workspace`

Pull requests should include:

- a clear summary of the change
- linked issue or task when available
- screenshots for UI changes
- notes on any architecture or tooling decisions

## Architecture Notes

Treat `memory-bank/RSS-design-document.md` as the source of truth for product scope, and `memory-bank/tech-stack.md` as the source of truth for implementation direction. Update both when major assumptions change.
