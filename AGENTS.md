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

No build or test pipeline is configured yet. Do not invent one in commits without documenting it here.

Useful local commands during the planning phase:

- `Get-ChildItem -Force` : inspect the repository root
- `Get-ChildItem -Recurse -File` : list all files
- `rg --files` : fast file listing when `ripgrep` is installed

When scaffolding begins, add the exact build, test, lint, and run commands to this section.

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
