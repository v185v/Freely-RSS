import { describe, expect, test } from "vitest"

import { buildReaderDocumentExport } from "./html-pdf-export"
import { fetchReaderShellData, resetMockReaderShellState } from "./mock-data"
import type { ReaderDocumentExportPresentation } from "./types"

const defaultPresentation: ReaderDocumentExportPresentation = {
  contentMode: "extracted",
  fontFamily: "editorial",
  fontScale: "comfortable",
  lineHeight: "relaxed",
  marginMode: "balanced",
  themeTone: "midnight",
}

describe("reader HTML/PDF export", () => {
  test("serializes a selected article into standalone HTML with reader annotations", async () => {
    resetMockReaderShellState()
    const shellData = await fetchReaderShellData()
    const detail = shellData.articleDetails["article-layout-shell"]

    if (!detail) {
      throw new Error("Expected article-layout-shell fixture to exist.")
    }

    const result = buildReaderDocumentExport({
      details: [detail],
      format: "html",
      generatedAt: "2026-04-29T00:00:00.000Z",
      mode: "single",
      presentation: defaultPresentation,
    })

    expect(result.fileName).toBe(
      "turning-the-desktop-shell-into-a-stable-three-pane-reader-skeleton.html",
    )
    expect(result.report.exportedArticleCount).toBe(1)
    expect(result.report.annotationCount).toBe(1)
    expect(result.report.presentationSummary).toContain("Extracted content")
    expect(result.documentText).toContain("<!doctype html>")
    expect(result.documentText).toContain(`data-export-format="html"`)
    expect(result.documentText).toContain(
      "<h1>Turning the desktop shell into a stable three-pane reader skeleton</h1>",
    )
    expect(result.documentText).toContain("<dt>Source</dt><dd>FreelyRSS Engineering</dd>")
    expect(result.documentText).toContain("Step 16 is about state ownership.")
    expect(result.documentText).toContain(`data-annotation-id="annotation-layout-shell"`)
    expect(result.documentText).toContain("Route search params now own these selections.")
  })

  test("builds a PDF print source for visible queue export without changing the HTML boundary", async () => {
    resetMockReaderShellState()
    const shellData = await fetchReaderShellData()
    const layoutDetail = shellData.articleDetails["article-layout-shell"]
    const podcastDetail = shellData.articleDetails["article-midnight-dispatch"]

    if (!layoutDetail || !podcastDetail) {
      throw new Error("Expected batch export fixtures to exist.")
    }

    const result = buildReaderDocumentExport({
      details: [layoutDetail, podcastDetail],
      format: "pdf",
      generatedAt: "2026-04-29T00:00:00.000Z",
      mode: "batch",
      presentation: {
        ...defaultPresentation,
        contentMode: "raw",
        themeTone: "daylight",
      },
      title: "Unread desk PDF export",
    })

    expect(result.fileName).toBe("unread-desk-pdf-export-2026-04-29T00-00-00-000Z.pdf")
    expect(result.report.format).toBe("pdf")
    expect(result.report.contentMode).toBe("raw")
    expect(result.report.exportedArticleCount).toBe(2)
    expect(result.report.attachmentCount).toBe(2)
    expect(result.documentText).toContain(`<meta name="freelyrss-export-format" content="pdf">`)
    expect(result.documentText).toContain("FreelyRSS PDF print source")
    expect(result.documentText).toContain("@page")
    expect(result.documentText).toContain("Article count")
    expect(result.documentText).toContain("&lt;article class=&quot;post&quot;&gt;")
    expect(result.documentText).toContain("cache/media/night-audio/dispatch-42.mp3")
  })
})
