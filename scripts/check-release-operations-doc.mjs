import { readFile } from "node:fs/promises"

const DOC_PATH = "docs/release-operations.md"

const requiredPhrases = [
  "# FreelyRSS Release Operations Runbook",
  "## Fresh Checkout Bootstrap",
  "## Build and Startup Flow",
  "## Verification Gates",
  "## Packaging",
  "## Runtime Data Layout",
  "## Backup and Restore",
  "## Logs",
  "## Troubleshooting",
  "## Release Checklist",
  "corepack pnpm install",
  "corepack pnpm run verify",
  "corepack pnpm run desktop:tauri:dev",
  "corepack pnpm --filter @freelyrss/desktop tauri build -d --no-bundle",
  "corepack pnpm run desktop:tauri:build",
  "corepack pnpm run web:build",
  "corepack pnpm run mobile:check",
  "cargo run -p freelyrss-sync-server",
  "cargo build -p freelyrss-sync-server --release",
  "FREELYRSS_SYNC_BIND_ADDR",
  "database/freelyrss.sqlite3",
  "database/backups",
  "cache/content",
  "cache/media",
  "exports",
  "logs",
  "VACUUM INTO",
  "restore_database_from_backup"
]

const run = async () => {
  const document = await readFile(DOC_PATH, "utf8")
  const missing = requiredPhrases.filter((phrase) => !document.includes(phrase))

  if (missing.length > 0) {
    console.error(`${DOC_PATH} is missing required Step 85 release operations coverage:`)
    for (const phrase of missing) {
      console.error(`- ${phrase}`)
    }
    process.exit(1)
  }

  console.log(`${DOC_PATH} covers the Step 85 release operations checklist.`)
}

await run()
