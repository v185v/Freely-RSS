import { describe, expect, test } from "vitest"

import * as mobileClient from "./mobile-client"
import {
  MOBILE_DEFERRED_OPERATION_IDS,
  MOBILE_SCOPE_CONTRACT,
  summarizeMobileScopeRequirements,
} from "./mobile-scope"

describe("mobile scope contract", () => {
  test("keeps the first mobile shell free of blockers and scope violations", () => {
    const summary = summarizeMobileScopeRequirements()

    expect(summary.blockingRequirements).toBe(0)
    expect(summary.scopeViolations).toEqual([])
  })

  test("defers desktop-only and heavy administration capabilities", () => {
    expect(MOBILE_DEFERRED_OPERATION_IDS).toContain("local-feed-fetching")
    expect(MOBILE_DEFERRED_OPERATION_IDS).toContain("desktop-sqlite-access")
    expect(MOBILE_DEFERRED_OPERATION_IDS).toContain("tauri-command-access")
    expect(MOBILE_DEFERRED_OPERATION_IDS).toContain("complex-rule-editing")
    expect(MOBILE_DEFERRED_OPERATION_IDS).toContain("ai-generation-controls")
    expect(MOBILE_SCOPE_CONTRACT.mode).toBe("mobile-reading-priority")
  })

  test("mobile client exports synchronized read functions only", () => {
    const exportedFunctionNames = Object.entries(mobileClient)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort()

    expect(exportedFunctionNames).toEqual(["fetchMobileArticleDetail", "fetchMobileReaderSnapshot"])
  })
})
