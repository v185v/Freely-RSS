import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import App from "../../App"
import { createAppQueryClient } from "../../app/query-client"
import { createAppRouter } from "../../app/router"
import { fetchReaderShellData, resetMockReaderShellState } from "./mock-data"
import { resetReaderViewStore } from "./state"

const E2E_FEED_ID = "feed-e2e-offline-sample"
const E2E_ARTICLE_TITLE = "Fetched item from E2E Offline Sample"

function renderDesktopShell() {
  window.scrollTo = () => {}
  render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)
}

function getSectionByHeading(scope: ReturnType<typeof within>, name: string) {
  const section = scope.getByRole("heading", { name }).closest("section")

  if (!section) {
    throw new Error(`Could not find section for heading "${name}".`)
  }

  return section as HTMLElement
}

describe("desktop offline reader end-to-end", () => {
  beforeEach(() => {
    resetMockReaderShellState()
    resetReaderViewStore()
    window.history.pushState({}, "", "/")
  })

  afterEach(() => {
    cleanup()
    resetMockReaderShellState()
    resetReaderViewStore()
    window.history.pushState({}, "", "/")
  })

  test("covers source import, refresh, reading, state changes, search, and export", async () => {
    const user = userEvent.setup()
    const opmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="E2E imports">
      <outline
        text="E2E Offline Sample"
        type="rss"
        xmlUrl="https://e2e.example/feed.xml"
        htmlUrl="https://e2e.example"
      />
    </outline>
  </body>
</opml>`

    renderDesktopShell()

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const sourceScope = within(sourcePane)
    const importScope = within(getSectionByHeading(sourceScope, "OPML import"))

    fireEvent.change(importScope.getByLabelText("OPML payload"), {
      target: { value: opmlPayload },
    })

    await user.click(importScope.getByRole("button", { name: "Import OPML" }))

    const subscriptionTree = getSectionByHeading(sourceScope, "Subscription tree")
    const treeScope = within(subscriptionTree)

    await waitFor(() => {
      expect(treeScope.getByText("E2E imports")).toBeTruthy()
      expect(treeScope.getByText("E2E Offline Sample")).toBeTruthy()
    })

    expect(importScope.getByText("Feeds imported").parentElement?.textContent).toContain("1")
    expect(importScope.getByText("Folders created").parentElement?.textContent).toContain("1")
    expect(importScope.getByText("Duplicates skipped").parentElement?.textContent).toContain("0")

    await user.click(treeScope.getByRole("button", { name: /E2E Offline Sample/i }))

    await waitFor(() => {
      expect(window.location.search).toContain(`sourceId=${E2E_FEED_ID}`)
    })

    const editorScope = within(getSectionByHeading(sourceScope, "Feed editor"))

    expect(editorScope.getByText("https://e2e.example/feed.xml")).toBeTruthy()
    expect(editorScope.getByText("pending")).toBeTruthy()

    await user.click(editorScope.getByRole("button", { name: "Manual refresh" }))

    await waitFor(async () => {
      const shellData = await fetchReaderShellData()
      const e2eFeed = shellData.feedDetails[E2E_FEED_ID]
      const fetchedArticle = shellData.articles.find(
        (article) => article.title === E2E_ARTICLE_TITLE,
      )

      expect(e2eFeed?.healthStatus).toBe("healthy")
      expect(fetchedArticle?.feedId).toBe(E2E_FEED_ID)
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const queueScope = within(queuePane)
    const readerScope = within(readerPane)

    await waitFor(() => {
      expect(queueScope.getByText(E2E_ARTICLE_TITLE)).toBeTruthy()
      expect(readerScope.getByRole("heading", { name: E2E_ARTICLE_TITLE })).toBeTruthy()
    })

    expect(
      readerScope.getByText(
        /fetched when the feed was refreshed.*new content appears in the reading queue/i,
      ),
    ).toBeTruthy()

    await user.click(readerScope.getByRole("button", { name: "Read" }))

    await waitFor(async () => {
      const shellData = await fetchReaderShellData()
      const fetchedArticle = shellData.articles.find(
        (article) => article.title === E2E_ARTICLE_TITLE,
      )

      expect(fetchedArticle?.state.readState).toBe("read")
      expect(fetchedArticle?.state.readingProgress).toBe(1)
    })

    await user.click(readerScope.getByRole("button", { name: "Starred" }))

    await waitFor(async () => {
      const shellData = await fetchReaderShellData()
      const fetchedArticle = shellData.articles.find(
        (article) => article.title === E2E_ARTICLE_TITLE,
      )

      expect(fetchedArticle?.state.starred).toBe(true)
    })

    fireEvent.change(queueScope.getByLabelText("Article view filter"), {
      target: { value: "demonstrates" },
    })

    await waitFor(() => {
      expect(queuePane.querySelectorAll(".desktop-article-row")).toHaveLength(1)
      expect(queuePane.querySelector(".desktop-queue__search-mark")?.textContent).toBe(
        "demonstrates",
      )
      expect(
        readerScope.getByText("demonstrates", { selector: ".desktop-reader__search-hit" }),
      ).toBeTruthy()
    })

    const markdownScope = within(getSectionByHeading(readerScope, "Markdown export"))
    const exportedMarkdown = markdownScope.getByLabelText(
      "Exported Markdown",
    ) as HTMLTextAreaElement

    await user.click(markdownScope.getByRole("button", { name: "Export selected article" }))

    await waitFor(() => {
      expect(exportedMarkdown.value).toContain(`# ${E2E_ARTICLE_TITLE}`)
      expect(exportedMarkdown.value).toContain("- Source: E2E Offline Sample")
      expect(exportedMarkdown.value).toContain("- Read state: read")
      expect(exportedMarkdown.value).toContain("- Starred: yes")
    })

    const documentScope = within(getSectionByHeading(readerScope, "HTML/PDF export"))
    const exportedDocument = documentScope.getByLabelText(
      "Exported document source",
    ) as HTMLTextAreaElement

    await user.click(documentScope.getByRole("button", { name: "Export selected HTML" }))

    await waitFor(() => {
      expect(exportedDocument.value).toContain(`data-export-format="html"`)
      expect(exportedDocument.value).toContain(`<h1>${E2E_ARTICLE_TITLE}</h1>`)
      expect(exportedDocument.value).toContain("E2E Offline Sample")
    })
  })
})
