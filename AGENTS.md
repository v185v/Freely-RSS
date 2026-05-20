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
- `corepack pnpm run desktop:dev` : start the desktop frontend shell in Vite dev mode
- `corepack pnpm run desktop:build` : type-check and build the desktop frontend shell
- `corepack pnpm --filter @freelyrss/desktop tauri dev` : run the desktop application shell locally through Tauri
- `corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle` : validate the desktop shell end-to-end without generating installers
- `corepack pnpm run web:dev` : start the Web synchronized reader entry in Vite dev mode
- `corepack pnpm run web:build` : type-check and build the Web synchronized reader entry
- `corepack pnpm run mobile:dev` : start the Expo mobile reading shell
- `corepack pnpm run mobile:check` : type-check the Expo mobile reading shell
- `corepack pnpm run test:mobile` : run mobile scope and selector regression tests
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

`apps/mobile` currently validates the Expo shell with `mobile:check` and `test:mobile`; use Expo platform commands such as `corepack pnpm --filter @freelyrss/mobile ios` or `android` only when a simulator or device is available.

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
