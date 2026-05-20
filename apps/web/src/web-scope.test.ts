import { expect, test } from "vitest"

import * as remoteClient from "./remote-client"
import {
  WEB_DEFERRED_OPERATION_IDS,
  WEB_SCOPE_CONTRACT,
  summarizeWebScopeRequirements,
} from "./web-scope"

test("keeps initial web requirements inside the remote access boundary", () => {
  const summary = summarizeWebScopeRequirements()

  expect(summary.blockingRequirements).toBe(0)
  expect(summary.scopeViolations).toEqual([])
  expect(summary.allowedRequirements).toBeGreaterThan(0)
  expect(summary.deferredRequirements).toBeGreaterThan(0)
})

test("documents the desktop-only and out-of-scope web operations as deferred", () => {
  expect(WEB_DEFERRED_OPERATION_IDS).toEqual(
    expect.arrayContaining([
      "local-feed-fetch",
      "desktop-sqlite-access",
      "desktop-tauri-command",
      "full-offline-cache",
      "complex-rule-editor",
      "deep-system-integration",
    ]),
  )
  expect(
    WEB_SCOPE_CONTRACT.requirements
      .filter((requirement) => requirement.status === "deferred")
      .map((requirement) => requirement.operationId),
  ).toEqual(expect.arrayContaining([...WEB_DEFERRED_OPERATION_IDS]))
})

test("remote client exposes read operations only", () => {
  const exportedFunctionNames = Object.entries(remoteClient)
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name)
    .sort()

  expect(exportedFunctionNames).toEqual(["fetchRemoteArticleDetail", "fetchRemoteReaderSnapshot"])
})
