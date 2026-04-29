import { describe, expect, test } from "vitest"

import { buildReaderMarkdownExport } from "./markdown-export"
import { fetchReaderShellData, resetMockReaderShellState } from "./mock-data"

describe("reader Markdown export", () => {
  test("serializes article metadata, body text, annotations, and attachments", async () => {
    resetMockReaderShellState()
    const shellData = await fetchReaderShellData()
    const detail = shellData.articleDetails["article-layout-shell"]

    if (!detail) {
      throw new Error("Expected article-layout-shell fixture to exist.")
    }

    const result = buildReaderMarkdownExport({
      details: [detail],
      generatedAt: "2026-04-29T00:00:00.000Z",
      mode: "single",
    })

    expect(result.fileName).toBe(
      "turning-the-desktop-shell-into-a-stable-three-pane-reader-skeleton.md",
    )
    expect(result.report.exportedArticleCount).toBe(1)
    expect(result.report.annotationCount).toBe(1)
    expect(result.markdownText).toContain(
      "# Turning the desktop shell into a stable three-pane reader skeleton",
    )
    expect(result.markdownText).toContain("- Source: FreelyRSS Engineering")
    expect(result.markdownText).toContain("- Published: 2026-04-08T08:40:00Z")
    expect(result.markdownText).toContain("Step 16 is about state ownership.")
    expect(result.markdownText).toContain("## Annotations")
    expect(result.markdownText).toContain("> current source and selected article")
    expect(result.markdownText).toContain("Note: Route search params now own these selections.")
  })

  test("combines visible article details into one batch Markdown document", async () => {
    resetMockReaderShellState()
    const shellData = await fetchReaderShellData()
    const layoutDetail = shellData.articleDetails["article-layout-shell"]
    const podcastDetail = shellData.articleDetails["article-midnight-dispatch"]

    if (!layoutDetail || !podcastDetail) {
      throw new Error("Expected batch export fixtures to exist.")
    }

    const result = buildReaderMarkdownExport({
      details: [layoutDetail, podcastDetail],
      generatedAt: "2026-04-29T00:00:00.000Z",
      mode: "batch",
      title: "Unread desk Markdown export",
    })

    expect(result.fileName).toBe("unread-desk-markdown-export-2026-04-29T00-00-00-000Z.md")
    expect(result.report.exportedArticleCount).toBe(2)
    expect(result.report.annotationCount).toBe(1)
    expect(result.markdownText).toContain("# Unread desk Markdown export")
    expect(result.markdownText).toContain("- Article count: 2")
    expect(result.markdownText).toContain(
      "# Midnight dispatch 42: attachment boundaries for podcast feeds",
    )
    expect(result.markdownText).toContain("cache/media/night-audio/dispatch-42.mp3")
  })
})
