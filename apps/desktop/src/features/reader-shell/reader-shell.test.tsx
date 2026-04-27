import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test } from "vitest"

import App from "../../App"
import { createAppQueryClient } from "../../app/query-client"
import { createAppRouter } from "../../app/router"
import { fetchReaderShellData, importMockOpml, resetMockReaderShellState } from "./mock-data"
import { resetReaderViewStore } from "./state"
import type { ReaderShellData } from "./types"

function buildShellStructure(shellData: ReaderShellData) {
  const foldersById = new Map(shellData.folders.map((folder) => [folder.id, folder]))
  const folderPathCache = new Map<string, string>()

  function resolveFolderPath(folderId: string | null): string {
    if (!folderId) {
      return ""
    }

    const cachedPath = folderPathCache.get(folderId)

    if (cachedPath) {
      return cachedPath
    }

    const folder = foldersById.get(folderId)

    if (!folder) {
      throw new Error(`Unknown folder id in structure snapshot: ${folderId}`)
    }

    const parentPath = resolveFolderPath(folder.parentId)
    const path = parentPath.length > 0 ? `${parentPath}/${folder.name}` : folder.name

    folderPathCache.set(folderId, path)

    return path
  }

  return {
    feedPaths: Object.values(shellData.feedDetails)
      .map((feed) => {
        const folderPath = resolveFolderPath(feed.folderId)
        return folderPath.length > 0 ? `${folderPath}|${feed.feedUrl}` : feed.feedUrl
      })
      .sort(),
    folderPaths: shellData.folders.map((folder) => resolveFolderPath(folder.id)).sort(),
  }
}

function findTextNode(container: HTMLElement, searchText: string) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let currentNode = walker.nextNode()

  while (currentNode) {
    const textContent = currentNode.textContent ?? ""
    const offset = textContent.indexOf(searchText)

    if (offset >= 0) {
      return {
        node: currentNode,
        offset,
      }
    }

    currentNode = walker.nextNode()
  }

  throw new Error(`Could not find text node containing "${searchText}".`)
}

function selectReaderText(container: HTMLElement, searchText: string) {
  const { node, offset } = findTextNode(container, searchText)
  const selection = window.getSelection()
  const range = document.createRange()

  range.setStart(node, offset)
  range.setEnd(node, offset + searchText.length)
  selection?.removeAllRanges()
  selection?.addRange(range)
  fireEvent(document, new Event("selectionchange"))
}

describe("reader shell navigation", () => {
  afterEach(() => {
    cleanup()
    resetMockReaderShellState()
    resetReaderViewStore()
    window.history.pushState({}, "", "/")
  })

  test("reconciles stale article selection when switching through an empty route", async () => {
    window.scrollTo = () => {}
    window.history.pushState({}, "", "/?sourceId=feed-empty-holding&articleId=article-layout-shell")
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    await screen.findAllByText("Archive holding pen")
    await screen.findByText("No placeholder articles are visible for this route yet.")

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-empty-holding")
      expect(window.location.search).not.toContain("article-layout-shell")
    })

    const primaryNavigation = screen.getByRole("navigation", {
      name: "Primary reader navigation",
    })

    await user.click(within(primaryNavigation).getByRole("button", { name: /Unread desk/i }))

    await screen.findAllByText("Turning the desktop shell into a stable three-pane reader skeleton")

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=view-unread")
      expect(window.location.search).toContain("articleId=article-layout-shell")
    })
  })

  test("supports landmark shortcuts and exposes named regions for keyboard users", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const navigation = await screen.findByRole("navigation", {
      name: "Primary reader navigation",
    })
    const sourcePane = screen.getByRole("region", { name: "Sources" })
    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const highContrastToggle = screen.getByRole("button", { name: /High contrast:/i })

    expect(highContrastToggle.getAttribute("aria-pressed")).toBe("false")

    await user.tab()
    expect(document.activeElement?.textContent).toContain("Skip to primary navigation")

    fireEvent.keyDown(window, { altKey: true, key: "1" })
    expect(document.activeElement).toBe(navigation)

    fireEvent.keyDown(window, { altKey: true, key: "2" })
    expect(document.activeElement).toBe(sourcePane)

    fireEvent.keyDown(window, { altKey: true, key: "3" })
    expect(document.activeElement).toBe(queuePane)

    fireEvent.keyDown(window, { altKey: true, key: "4" })
    expect(document.activeElement).toBe(readerPane)

    fireEvent.keyDown(window, { altKey: true, shiftKey: true, key: "H" })

    expect(highContrastToggle.getAttribute("aria-pressed")).toBe("true")

    const themeRoot = document.querySelector(".fr-theme-root")
    expect(themeRoot?.className).toContain("fr-theme-root--high-contrast")
  })

  test("renders a collapsible subscription tree and refreshes the queue when selecting grouped sources", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()

    const treeScope = within(subscriptionTree as HTMLElement)

    expect(treeScope.getByText("Daily reading desk")).toBeTruthy()
    expect(treeScope.getByText("Core architecture")).toBeTruthy()
    expect(treeScope.getByText("FreelyRSS Engineering")).toBeTruthy()

    await user.click(treeScope.getByRole("button", { name: "Collapse Daily reading desk" }))

    await waitFor(() => {
      expect(treeScope.queryByText("Core architecture")).toBeNull()
      expect(treeScope.queryByText("FreelyRSS Engineering")).toBeNull()
    })

    await user.click(treeScope.getByRole("button", { name: "Expand Daily reading desk" }))

    await waitFor(() => {
      expect(treeScope.getAllByText("FreelyRSS Engineering").length).toBeGreaterThan(0)
    })

    await user.click(
      treeScope.getByRole("button", {
        name: /folder.*Research threads.*feeds grouped under this folder/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=folder-research")
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    expect(within(queuePane).getByText("Research threads")).toBeTruthy()
    expect(
      within(queuePane).getByText(
        "Shared-query is ready, but the reader shell still needs a clean composition layer",
      ),
    ).toBeTruthy()
    expect(
      within(queuePane).queryByText(
        "Turning the desktop shell into a stable three-pane reader skeleton",
      ),
    ).toBeNull()
  })

  test("renders smart folders beside quick views and applies saved query definitions", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const smartFolderSection = within(sourcePane)
      .getByRole("heading", {
        name: "Smart folders",
      })
      .closest("section")

    expect(smartFolderSection).not.toBeNull()

    const smartFolderScope = within(smartFolderSection as HTMLElement)

    expect(smartFolderScope.getByText("Last 7 days unread")).toBeTruthy()

    await user.click(
      smartFolderScope.getByRole("button", {
        name: /Last 7 days unread/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=smart-folder-last-7-days-unread")
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const queueScope = within(queuePane)

    expect(queueScope.getByText("Last 7 days unread")).toBeTruthy()
    expect(
      queueScope.getByText(
        /Route scope "Last 7 days unread" reuses its saved shared query definition\./i,
        {
          selector: "p",
        },
      ),
    ).toBeTruthy()
    expect(queueScope.getByText(/"field": "publishedAt"/i)).toBeTruthy()
    expect(queueScope.getByText(/"value": "2026-04-11T00:00:00Z"/i)).toBeTruthy()
  })

  test("combines route scope, shell filters, and sort mode into one article query flow", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()

    const treeScope = within(subscriptionTree as HTMLElement)

    await user.click(
      treeScope.getByRole("button", {
        name: /healthy.*FreelyRSS Engineering/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-freelyrss")
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const queueScope = within(queuePane)
    const getQueueRows = () => Array.from(queuePane.querySelectorAll(".desktop-article-row"))

    await waitFor(() => {
      const rows = getQueueRows()
      expect(rows).toHaveLength(2)
      expect(rows[0]?.textContent).toContain(
        "Turning the desktop shell into a stable three-pane reader skeleton",
      )
    })

    expect(
      queueScope.getByText(/Route scope "FreelyRSS Engineering" maps to a single feed id\./i, {
        selector: "p",
      }),
    ).toBeTruthy()
    expect(queueScope.getByText(/"field": "feedId"/i)).toBeTruthy()
    expect(queueScope.getByText(/"value": "feed-freelyrss"/i)).toBeTruthy()
    expect(queueScope.getByText(/"direction": "desc"/i)).toBeTruthy()

    await user.click(queueScope.getByRole("button", { name: "Sort: oldest" }))

    await waitFor(() => {
      const rows = getQueueRows()
      expect(rows).toHaveLength(2)
      expect(rows[0]?.textContent).toContain(
        "Making narrow-window behavior predictable before routing and async data land",
      )
    })

    expect(queueScope.getByText(/"direction": "asc"/i)).toBeTruthy()

    fireEvent.change(queueScope.getByLabelText("Article view filter"), {
      target: { value: "narrow-window" },
    })

    await waitFor(() => {
      const rows = getQueueRows()
      expect(rows).toHaveLength(1)
      expect(rows[0]?.textContent).toContain(
        "Making narrow-window behavior predictable before routing and async data land",
      )
    })

    await user.click(queueScope.getByRole("button", { name: "Reading" }))

    await waitFor(() => {
      expect(
        queueScope.getByText("No placeholder articles are visible for this route yet."),
      ).toBeTruthy()
    })

    fireEvent.change(queueScope.getByLabelText("Article view filter"), {
      target: { value: "" },
    })

    await waitFor(() => {
      const rows = getQueueRows()
      expect(rows).toHaveLength(1)
      expect(rows[0]?.textContent).toContain(
        "Turning the desktop shell into a stable three-pane reader skeleton",
      )
    })

    expect(queueScope.getByText(/"field": "readState"/i)).toBeTruthy()
    expect(queueScope.getByText(/"value": "reading"/i)).toBeTruthy()
  })

  test("parses shared-query text syntax in the queue filter before executing the route-backed query", async () => {
    window.scrollTo = () => {}

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const queueScope = within(queuePane)
    const getQueueRows = () => Array.from(queuePane.querySelectorAll(".desktop-article-row"))

    fireEvent.change(queueScope.getByLabelText("Article view filter"), {
      target: { value: "tag:search OR has:attachment" },
    })

    await waitFor(() => {
      const rows = getQueueRows()
      expect(rows).toHaveLength(2)
      expect(rows[0]?.textContent).toContain(
        "Shared-query is ready, but the reader shell still needs a clean composition layer",
      )
      expect(rows[1]?.textContent).toContain(
        "Midnight dispatch 42: attachment boundaries for podcast feeds",
      )
    })

    expect(queueScope.queryByText(/Why layout state should stay separate/i)).toBeNull()
    expect(queueScope.getByText(/"match": "any"/i)).toBeTruthy()
    expect(queueScope.getByText(/"field": "tag"/i)).toBeTruthy()
    expect(queueScope.getByText(/"field": "hasAttachment"/i)).toBeTruthy()
  })

  test("shows queue-filter parse errors without dropping the route-backed result set", async () => {
    window.scrollTo = () => {}

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const queueScope = within(queuePane)
    const getQueueRows = () => Array.from(queuePane.querySelectorAll(".desktop-article-row"))

    fireEvent.change(queueScope.getByLabelText("Article view filter"), {
      target: { value: "(" },
    })

    await waitFor(() => {
      expect(queueScope.getByRole("alert").textContent ?? "").toMatch(
        /Queue filter could not be parsed at line 1, column 1:/i,
      )
      expect(getQueueRows()).toHaveLength(4)
    })

    expect(
      queueScope.getByText(/Turning the desktop shell into a stable three-pane reader skeleton/i),
    ).toBeTruthy()
    expect(
      queueScope.getByText(/Midnight dispatch 42: attachment boundaries for podcast feeds/i),
    ).toBeTruthy()
  })

  test("renders search hit snippets in the queue and highlights body-only matches in the reader", async () => {
    window.scrollTo = () => {}

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const queueScope = within(queuePane)
    const readerScope = within(readerPane)
    const getQueueRows = () => Array.from(queuePane.querySelectorAll(".desktop-article-row"))

    fireEvent.change(queueScope.getByLabelText("Article view filter"), {
      target: { value: "caching" },
    })

    await waitFor(() => {
      expect(getQueueRows()).toHaveLength(1)
      expect(window.location.search).toContain("articleId=article-source-context")
    })

    const searchSnippetMark = queuePane.querySelector(".desktop-queue__search-mark")
    expect(searchSnippetMark?.textContent).toBe("caching")
    expect(queueScope.getByText(/search text, fetching,/i)).toBeTruthy()

    await waitFor(() => {
      expect(
        readerScope.getByText("caching", { selector: ".desktop-reader__search-hit" }),
      ).toBeTruthy()
    })
  })

  test("renders a stable reading panel base view and swaps article content without stale detail", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const queueScope = within(queuePane)
    const readerScope = within(readerPane)

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Turning the desktop shell into a stable three-pane reader skeleton",
        }),
      ).toBeTruthy()
    })

    expect(readerScope.getByText("FreelyRSS Engineering")).toBeTruthy()
    expect(readerScope.getByText("FreelyRSS")).toBeTruthy()
    expect(
      readerScope.getByText(
        /The shell now reads like an application instead of a package showcase/i,
      ),
    ).toBeTruthy()
    expect(readerScope.getByText(/Step 16 is about state ownership/i)).toBeTruthy()

    await user.click(
      queueScope.getByRole("button", {
        name: /Why layout state should stay separate from source and query state/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("articleId=article-source-context")
    })

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Why layout state should stay separate from source and query state",
        }),
      ).toBeTruthy()
    })

    expect(readerScope.getByText("Systems Desk")).toBeTruthy()
    expect(
      readerScope.getByText(
        /Selection and context can live in the shell without turning the shell into the execution layer/i,
      ),
    ).toBeTruthy()
    expect(
      readerScope.getByText(
        /A common failure mode is to let the first interactive shell absorb every future concern/i,
      ),
    ).toBeTruthy()
    expect(readerScope.queryByText(/Step 16 is about state ownership/i)).toBeNull()
    expect(
      readerScope.queryByText(
        /The shell now reads like an application instead of a package showcase/i,
      ),
    ).toBeNull()
  })

  test("switches reader content modes and keeps the latest mode after the app reopens", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()
    const renderShell = () =>
      render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    renderShell()

    const readerPane = await screen.findByRole("region", { name: "Reading panel" })
    const readerScope = within(readerPane)

    await waitFor(() => {
      expect(
        readerScope
          .getByRole("button", {
            name: "Extracted content",
          })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    })

    expect(readerScope.getByText(/Step 16 is about state ownership/i)).toBeTruthy()
    expect(readerScope.queryByText(/<article class="post">/i)).toBeNull()

    await user.click(
      readerScope.getByRole("button", {
        name: "Original content",
      }),
    )

    await waitFor(() => {
      expect(
        readerScope
          .getByRole("button", {
            name: "Original content",
          })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    })

    expect(readerScope.getByText(/<article class="post">/i)).toBeTruthy()
    expect(readerScope.queryByText(/Step 16 is about state ownership/i)).toBeNull()

    cleanup()
    resetReaderViewStore({ preservePersistedReaderContentMode: true })
    renderShell()

    const reopenedReaderPane = await screen.findByRole("region", { name: "Reading panel" })
    const reopenedReaderScope = within(reopenedReaderPane)

    await waitFor(() => {
      expect(
        reopenedReaderScope
          .getByRole("button", {
            name: "Original content",
          })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    })

    expect(reopenedReaderScope.getByText(/<article class="post">/i)).toBeTruthy()
    expect(reopenedReaderScope.queryByText(/Step 16 is about state ownership/i)).toBeNull()
  })

  test("persists reading theme and layout settings after the app reopens and keeps high contrast readable", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()
    const renderShell = () =>
      render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)
    const getThemeRoot = () => document.querySelector(".fr-theme-root")

    renderShell()

    const readerPane = await screen.findByRole("region", { name: "Reading panel" })
    const readerScope = within(readerPane)

    await user.click(readerScope.getByRole("button", { name: "Daylight" }))
    await user.click(readerScope.getByRole("button", { name: /Technical/i }))
    await user.click(readerScope.getByRole("button", { name: "Large" }))
    await user.click(readerScope.getByRole("button", { name: "Airy" }))
    await user.click(readerScope.getByRole("button", { name: "Wide" }))

    await waitFor(() => {
      const readerArticle = readerPane.querySelector(".desktop-reader__article")

      expect(getThemeRoot()?.className).toContain("fr-theme-root--daylight")
      expect(readerArticle?.getAttribute("data-reader-theme-tone")).toBe("daylight")
      expect(readerArticle?.getAttribute("data-reader-font-family")).toBe("technical")
      expect(readerArticle?.getAttribute("data-reader-font-scale")).toBe("large")
      expect(readerArticle?.getAttribute("data-reader-line-height")).toBe("airy")
      expect(readerArticle?.getAttribute("data-reader-margin-mode")).toBe("wide")
    })

    cleanup()
    resetReaderViewStore({ preservePersistedReaderPresentationSettings: true })
    renderShell()

    const reopenedReaderPane = await screen.findByRole("region", { name: "Reading panel" })
    const reopenedReaderScope = within(reopenedReaderPane)

    await waitFor(() => {
      const reopenedReaderArticle = reopenedReaderPane.querySelector(".desktop-reader__article")

      expect(getThemeRoot()?.className).toContain("fr-theme-root--daylight")
      expect(reopenedReaderArticle?.getAttribute("data-reader-theme-tone")).toBe("daylight")
      expect(reopenedReaderArticle?.getAttribute("data-reader-font-family")).toBe("technical")
      expect(reopenedReaderArticle?.getAttribute("data-reader-font-scale")).toBe("large")
      expect(reopenedReaderArticle?.getAttribute("data-reader-line-height")).toBe("airy")
      expect(reopenedReaderArticle?.getAttribute("data-reader-margin-mode")).toBe("wide")
    })

    await user.click(reopenedReaderScope.getByRole("button", { name: "High contrast" }))

    await waitFor(() => {
      expect(getThemeRoot()?.className).toContain("fr-theme-root--high-contrast")
    })

    expect(reopenedReaderScope.getByText(/Step 16 is about state ownership/i)).toBeTruthy()
  })

  test("creates anchored highlights and notes from extracted reader selections and replays them after reopening", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()
    const renderShell = () =>
      render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    renderShell()

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const queueScope = within(queuePane)
    const readerScope = within(readerPane)

    await user.click(
      queueScope.getByRole("button", {
        name: /Why layout state should stay separate from source and query state/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("articleId=article-source-context")
    })

    const highlightText = "first interactive shell absorb every future concern"
    const noteText = "desktop shell only needs enough local state"

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Why layout state should stay separate from source and query state",
        }),
      ).toBeTruthy()
      expect(readerPane.querySelector('[data-reader-paragraph-index="0"]')).toBeTruthy()
      expect(readerPane.querySelector('[data-reader-paragraph-index="1"]')).toBeTruthy()
    })

    selectReaderText(
      readerPane.querySelector('[data-reader-paragraph-index="0"]') as HTMLElement,
      highlightText,
    )

    await waitFor(() => {
      expect(readerScope.getByText(highlightText, { selector: "blockquote" })).toBeTruthy()
    })

    await user.click(readerScope.getByRole("button", { name: "Create highlight" }))

    await waitFor(() => {
      expect(readerPane.querySelectorAll('[data-annotation-type="highlight"]')).toHaveLength(1)
    })

    selectReaderText(
      readerPane.querySelector('[data-reader-paragraph-index="1"]') as HTMLElement,
      noteText,
    )

    await waitFor(() => {
      expect(readerScope.getByText(noteText, { selector: "blockquote" })).toBeTruthy()
    })

    await user.type(
      readerScope.getByLabelText("Annotation note"),
      "Keep durable anchors out of route state until SQLite wiring lands.",
    )
    await user.click(readerScope.getByRole("button", { name: "Create note" }))

    await waitFor(() => {
      expect(readerPane.querySelectorAll('[data-annotation-type="highlight"]')).toHaveLength(1)
      expect(readerPane.querySelectorAll('[data-annotation-type="note"]')).toHaveLength(1)
      expect(
        readerScope.getByText("Keep durable anchors out of route state until SQLite wiring lands."),
      ).toBeTruthy()
      expect(readerScope.getByText("2 anchored item(s) in the reader.")).toBeTruthy()
    })

    cleanup()
    renderShell()

    const reopenedReaderPane = await screen.findByRole("region", { name: "Reading panel" })
    const reopenedReaderScope = within(reopenedReaderPane)

    await waitFor(() => {
      expect(
        reopenedReaderScope.getByRole("heading", {
          name: "Why layout state should stay separate from source and query state",
        }),
      ).toBeTruthy()
      expect(
        reopenedReaderPane.querySelectorAll('[data-annotation-type="highlight"]'),
      ).toHaveLength(1)
      expect(reopenedReaderPane.querySelectorAll('[data-annotation-type="note"]')).toHaveLength(1)
    })

    expect(
      reopenedReaderScope.getByText(
        "Keep durable anchors out of route state until SQLite wiring lands.",
      ),
    ).toBeTruthy()
    expect(reopenedReaderScope.getByText("2 anchored item(s) in the reader.")).toBeTruthy()
  })

  test("shows podcast enclosure metadata in the reading panel for audio attachments", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()

    const treeScope = within(subscriptionTree as HTMLElement)

    await user.click(
      treeScope.getByRole("button", {
        name: /paused.*Night Audio Digest/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-night-audio")
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const queueScope = within(queuePane)
    const readerScope = within(readerPane)

    await waitFor(() => {
      expect(
        queueScope.getByRole("button", {
          name: /Midnight dispatch 42: attachment boundaries for podcast feeds/i,
        }),
      ).toBeTruthy()
    })

    await user.click(
      queueScope.getByRole("button", {
        name: /Midnight dispatch 42: attachment boundaries for podcast feeds/i,
      }),
    )

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Midnight dispatch 42: attachment boundaries for podcast feeds",
        }),
      ).toBeTruthy()
    })

    expect(readerScope.getByText("Podcast enclosure")).toBeTruthy()
    expect(readerScope.getByText("dispatch-42.mp3")).toBeTruthy()
    expect(readerScope.getByText("audio/mpeg")).toBeTruthy()
    expect(readerScope.getByText("52:06")).toBeTruthy()
    expect(readerScope.getByText("14.4 MB")).toBeTruthy()
    expect(readerScope.getByText("cache/media/night-audio/dispatch-42.mp3")).toBeTruthy()
    expect(readerScope.getByText("Image attachment")).toBeTruthy()
    expect(readerScope.getByText("episode-42-cover.jpg")).toBeTruthy()
  })

  test("writes article read state through the shell command path and reconciles the unread route", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const readerScope = within(readerPane)

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Turning the desktop shell into a stable three-pane reader skeleton",
        }),
      ).toBeTruthy()
      expect(window.location.search).toContain("articleId=article-layout-shell")
    })

    await user.click(
      readerScope.getByRole("button", {
        name: "Read",
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=view-unread")
      expect(window.location.search).toContain("articleId=article-source-context")
    })

    expect(
      within(queuePane).queryByRole("button", {
        name: /Turning the desktop shell into a stable three-pane reader skeleton/i,
      }),
    ).toBeNull()

    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()

    await user.click(
      within(subscriptionTree as HTMLElement).getByRole("button", {
        name: /healthy.*FreelyRSS Engineering/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-freelyrss")
    })

    await user.click(
      within(queuePane).getByRole("button", {
        name: /Turning the desktop shell into a stable three-pane reader skeleton/i,
      }),
    )

    await waitFor(() => {
      const stateSummary = readerScope.getByText("State").parentElement
      const progressSummary = readerScope.getByText("Progress").parentElement

      expect(stateSummary).not.toBeNull()
      expect(progressSummary).not.toBeNull()
      expect(within(stateSummary as HTMLElement).getByText("read")).toBeTruthy()
      expect(within(progressSummary as HTMLElement).getByText("100%")).toBeTruthy()
    })
  })

  test("supports a keyboard-only reading flow across queue movement, reader focus, and read-state updates", async () => {
    window.scrollTo = () => {}

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const readerScope = within(readerPane)

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=view-unread")
      expect(window.location.search).toContain("articleId=article-layout-shell")
    })

    fireEvent.keyDown(window, { altKey: true, key: "3" })
    expect(document.activeElement).toBe(queuePane)

    fireEvent.keyDown(window, { key: "ArrowDown" })

    await waitFor(() => {
      expect(window.location.search).toContain("articleId=article-source-context")
    })

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Why layout state should stay separate from source and query state",
        }),
      ).toBeTruthy()
    })

    fireEvent.keyDown(window, { key: "Enter" })
    expect(document.activeElement).toBe(readerPane)

    fireEvent.keyDown(window, { key: "m" })

    await waitFor(() => {
      expect(window.location.search).toContain("articleId=article-layout-shell")
      expect(window.location.search).not.toContain("articleId=article-source-context")
    })

    await waitFor(() => {
      expect(
        readerScope.getByRole("heading", {
          name: "Turning the desktop shell into a stable three-pane reader skeleton",
        }),
      ).toBeTruthy()
    })

    fireEvent.keyDown(window, { key: "j" })

    await waitFor(() => {
      expect(window.location.search).toContain("articleId=article-query-bridge")
    })

    expect(document.activeElement).toBe(readerPane)
    expect(
      readerScope.getByRole("heading", {
        name: "Shared-query is ready, but the reader shell still needs a clean composition layer",
      }),
    ).toBeTruthy()
  })

  test("persists mutated article state fields and reading progress after the app reopens", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()
    const renderShell = () =>
      render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    renderShell()

    const queuePane = await screen.findByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    const queueScope = within(queuePane)
    const readerScope = within(readerPane)

    await user.click(
      queueScope.getByRole("button", {
        name: /Why layout state should stay separate from source and query state/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("articleId=article-source-context")
    })

    await user.click(readerScope.getByRole("button", { name: "Starred" }))
    await user.click(readerScope.getByRole("button", { name: "Liked" }))
    await user.click(readerScope.getByRole("button", { name: "Read later" }))
    await user.click(readerScope.getByRole("button", { name: "High" }))
    await user.click(
      readerScope.getByRole("button", {
        name: "Set reading progress to 75%",
      }),
    )

    await waitFor(() => {
      const stateSummary = readerScope.getByText("State").parentElement
      const progressSummary = readerScope.getByText("Progress").parentElement
      const starredSummary = readerScope.getByText("Starred state").parentElement
      const likedSummary = readerScope.getByText("Liked state").parentElement
      const readLaterSummary = readerScope.getByText("Read later state").parentElement
      const importanceSummary = readerScope.getByText("Importance level").parentElement

      expect(stateSummary).not.toBeNull()
      expect(progressSummary).not.toBeNull()
      expect(starredSummary).not.toBeNull()
      expect(likedSummary).not.toBeNull()
      expect(readLaterSummary).not.toBeNull()
      expect(importanceSummary).not.toBeNull()
      expect(within(stateSummary as HTMLElement).getByText("reading")).toBeTruthy()
      expect(within(progressSummary as HTMLElement).getByText("75%")).toBeTruthy()
      expect(within(starredSummary as HTMLElement).getByText("Yes")).toBeTruthy()
      expect(within(likedSummary as HTMLElement).getByText("No")).toBeTruthy()
      expect(within(readLaterSummary as HTMLElement).getByText("Yes")).toBeTruthy()
      expect(within(importanceSummary as HTMLElement).getByText("high")).toBeTruthy()
    })

    cleanup()
    renderShell()

    const reopenedReaderPane = await screen.findByRole("region", { name: "Reading panel" })
    const reopenedReaderScope = within(reopenedReaderPane)

    await waitFor(() => {
      const stateSummary = reopenedReaderScope.getByText("State").parentElement
      const progressSummary = reopenedReaderScope.getByText("Progress").parentElement
      const starredSummary = reopenedReaderScope.getByText("Starred state").parentElement
      const likedSummary = reopenedReaderScope.getByText("Liked state").parentElement
      const readLaterSummary = reopenedReaderScope.getByText("Read later state").parentElement
      const importanceSummary = reopenedReaderScope.getByText("Importance level").parentElement

      expect(stateSummary).not.toBeNull()
      expect(progressSummary).not.toBeNull()
      expect(starredSummary).not.toBeNull()
      expect(likedSummary).not.toBeNull()
      expect(readLaterSummary).not.toBeNull()
      expect(importanceSummary).not.toBeNull()
      expect(within(stateSummary as HTMLElement).getByText("reading")).toBeTruthy()
      expect(within(progressSummary as HTMLElement).getByText("75%")).toBeTruthy()
      expect(within(starredSummary as HTMLElement).getByText("Yes")).toBeTruthy()
      expect(within(likedSummary as HTMLElement).getByText("No")).toBeTruthy()
      expect(within(readLaterSummary as HTMLElement).getByText("Yes")).toBeTruthy()
      expect(within(importanceSummary as HTMLElement).getByText("high")).toBeTruthy()
    })
  })

  test("virtualizes long queues and moves the render window when the middle pane scrolls", async () => {
    window.scrollTo = () => {}
    resetMockReaderShellState({ mode: "dense-queue" })
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()

    const treeScope = within(subscriptionTree as HTMLElement)

    await user.click(
      treeScope.getByRole("button", {
        name: /healthy.*Queue Virtualization Lab/i,
      }),
    )

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-queue-lab")
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const queueScope = within(queuePane)
    const getQueueRows = () => Array.from(queuePane.querySelectorAll(".desktop-article-row"))
    const scrollRegion = queuePane.querySelector(".desktop-pane__scroll--queue")

    expect(scrollRegion).not.toBeNull()

    await waitFor(() => {
      expect(getQueueRows().length).toBeGreaterThan(0)
      expect(getQueueRows().length).toBeLessThan(48)
      expect(queueScope.getByText("Queue window article 01")).toBeTruthy()
      expect(queueScope.queryByText("Queue window article 24")).toBeNull()
      expect(queueScope.getByText(/Rendering \d+ of 48 rows/i)).toBeTruthy()
    })

    Object.defineProperty(scrollRegion as HTMLElement, "scrollTop", {
      configurable: true,
      value: 3000,
      writable: true,
    })
    fireEvent.scroll(scrollRegion as HTMLElement)

    await waitFor(() => {
      expect(queueScope.getByText("Queue window article 24")).toBeTruthy()
      expect(queueScope.queryByText("Queue window article 01")).toBeNull()
      expect(getQueueRows().length).toBeLessThan(48)
    })
  })

  test("edits feed metadata and records a manual refresh through the shell command path", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()
    const renderShell = () =>
      render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    renderShell()

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()

    const treeScope = within(subscriptionTree as HTMLElement)

    await user.click(
      treeScope.getByRole("button", {
        name: /degraded.*Query Notes.*malformed XML near the channel header/i,
      }),
    )

    const editor = within(sourcePane)
      .getByRole("heading", {
        name: "Feed editor",
      })
      .closest("section")

    expect(editor).not.toBeNull()

    const editorScope = within(editor as HTMLElement)

    await user.clear(editorScope.getByLabelText("Source title"))
    await user.type(editorScope.getByLabelText("Source title"), "Parser Dispatch")
    await user.clear(editorScope.getByLabelText("Custom display label"))
    await user.type(editorScope.getByLabelText("Custom display label"), "SQL Parser Watch")
    await user.clear(editorScope.getByLabelText("Update interval (minutes)"))
    await user.type(editorScope.getByLabelText("Update interval (minutes)"), "30")
    await user.clear(editorScope.getByLabelText("Icon URL"))
    await user.type(
      editorScope.getByLabelText("Icon URL"),
      "https://query.example/assets/query-notes.svg",
    )
    await user.click(editorScope.getByRole("button", { name: "Content + attachments" }))

    await user.click(editorScope.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(treeScope.getByText("SQL Parser Watch")).toBeTruthy()
      expect((editorScope.getByLabelText("Source title") as HTMLInputElement).value).toBe(
        "Parser Dispatch",
      )
      expect((editorScope.getByLabelText("Custom display label") as HTMLInputElement).value).toBe(
        "SQL Parser Watch",
      )
      expect(
        (editorScope.getByLabelText("Update interval (minutes)") as HTMLInputElement).value,
      ).toBe("30")
      expect((editorScope.getByLabelText("Icon URL") as HTMLInputElement).value).toBe(
        "https://query.example/assets/query-notes.svg",
      )
      expect(
        editorScope
          .getByRole("button", { name: "Content + attachments" })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    })

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    const readerPane = screen.getByRole("region", { name: "Reading panel" })

    expect(within(queuePane).getAllByText("SQL Parser Watch").length).toBeGreaterThan(0)
    expect(within(readerPane).getAllByText("SQL Parser Watch").length).toBeGreaterThan(0)

    cleanup()
    renderShell()

    const reopenedSourcePane = await screen.findByRole("region", { name: "Sources" })
    const reopenedEditor = within(reopenedSourcePane)
      .getByRole("heading", {
        name: "Feed editor",
      })
      .closest("section")

    expect(reopenedEditor).not.toBeNull()

    const reopenedEditorScope = within(reopenedEditor as HTMLElement)

    await waitFor(() => {
      expect((reopenedEditorScope.getByLabelText("Source title") as HTMLInputElement).value).toBe(
        "Parser Dispatch",
      )
      expect(
        (reopenedEditorScope.getByLabelText("Custom display label") as HTMLInputElement).value,
      ).toBe("SQL Parser Watch")
      expect(
        (reopenedEditorScope.getByLabelText("Update interval (minutes)") as HTMLInputElement).value,
      ).toBe("30")
      expect((reopenedEditorScope.getByLabelText("Icon URL") as HTMLInputElement).value).toBe(
        "https://query.example/assets/query-notes.svg",
      )
      expect(
        reopenedEditorScope
          .getByRole("button", { name: "Content + attachments" })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    })

    await user.click(reopenedEditorScope.getByRole("button", { name: "Manual refresh" }))

    await waitFor(() => {
      expect(reopenedEditorScope.getAllByText("healthy").length).toBeGreaterThan(0)
      expect(reopenedEditorScope.queryByText(/malformed XML near the channel header/i)).toBeNull()
    })
  })

  test("persists global cache settings and seeds imported feeds with the current default policy", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()
    const renderShell = () =>
      render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    renderShell()

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const cacheSettingsSection = within(sourcePane)
      .getByRole("heading", {
        name: "Cache settings",
      })
      .closest("section")

    expect(cacheSettingsSection).not.toBeNull()

    const cacheSettingsScope = within(cacheSettingsSection as HTMLElement)

    await user.clear(cacheSettingsScope.getByLabelText("Global cache limit (MB)"))
    await user.type(cacheSettingsScope.getByLabelText("Global cache limit (MB)"), "1024")
    await user.click(cacheSettingsScope.getByRole("button", { name: "Metadata only" }))
    await user.click(cacheSettingsScope.getByRole("button", { name: "Save cache settings" }))

    await waitFor(async () => {
      const shellData = await fetchReaderShellData()

      expect(shellData.cacheSettings.maxBytes).toBe(1_073_741_824)
      expect(shellData.cacheSettings.defaultPolicy).toBe("metadata-only")
    })

    cleanup()
    renderShell()

    const reopenedSourcePane = await screen.findByRole("region", { name: "Sources" })
    const reopenedCacheSettingsSection = within(reopenedSourcePane)
      .getByRole("heading", {
        name: "Cache settings",
      })
      .closest("section")

    expect(reopenedCacheSettingsSection).not.toBeNull()

    const reopenedCacheSettingsScope = within(reopenedCacheSettingsSection as HTMLElement)

    await waitFor(() => {
      expect(
        (reopenedCacheSettingsScope.getByLabelText("Global cache limit (MB)") as HTMLInputElement)
          .value,
      ).toBe("1024")
      expect(
        reopenedCacheSettingsScope
          .getByRole("button", { name: "Metadata only" })
          .getAttribute("aria-pressed"),
      ).toBe("true")
    })

    const importResult = await importMockOpml(`<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Cache defaults" title="Cache defaults">
      <outline
        text="Cache Default Feed"
        title="Cache Default Feed"
        type="rss"
        xmlUrl="https://cache-default.example/feed.xml"
        htmlUrl="https://cache-default.example"
      />
    </outline>
  </body>
</opml>`)
    const importedFeed = Object.values(importResult.shellData.feedDetails).find(
      (feed) => feed.feedUrl === "https://cache-default.example/feed.xml",
    )

    expect(importedFeed?.cachePolicy).toBe("metadata-only")
  })

  test("imports OPML with nested folders and skips duplicate feed URLs", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const subscriptionTree = within(sourcePane)
      .getByRole("heading", {
        name: "Subscription tree",
      })
      .closest("section")
    const importSection = within(sourcePane)
      .getByRole("heading", {
        name: "OPML import",
      })
      .closest("section")

    expect(subscriptionTree).not.toBeNull()
    expect(importSection).not.toBeNull()

    const treeScope = within(subscriptionTree as HTMLElement)
    const importScope = within(importSection as HTMLElement)
    const opmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Imported research">
      <outline text="Parsing desk">
        <outline
          text="Rust Systems Weekly"
          type="rss"
          xmlUrl="https://systems.example/feed.xml"
          htmlUrl="https://systems.example"
        />
        <outline
          text="XML Weekly"
          type="rss"
          xmlUrl="https://xml.example/feed.xml"
          htmlUrl="https://xml.example"
        />
        <outline
          text="XML Weekly duplicate"
          type="rss"
          xmlUrl="https://xml.example/feed.xml"
          htmlUrl="https://xml.example"
        />
      </outline>
      <outline
        text="Atom Signals"
        type="atom"
        xmlUrl="https://signals.example/atom.xml"
        htmlUrl="https://signals.example"
      />
    </outline>
  </body>
</opml>`

    fireEvent.change(importScope.getByLabelText("OPML payload"), {
      target: { value: opmlPayload },
    })

    await user.click(importScope.getByRole("button", { name: "Import OPML" }))

    await waitFor(() => {
      expect(treeScope.getByText("Imported research")).toBeTruthy()
      expect(treeScope.getByText("Parsing desk")).toBeTruthy()
      expect(treeScope.getByText("XML Weekly")).toBeTruthy()
      expect(treeScope.getByText("Atom Signals")).toBeTruthy()
    })

    expect(treeScope.queryByText("XML Weekly duplicate")).toBeNull()

    const importedFeedsSummary = importScope.getByText("Feeds imported").parentElement
    const createdFoldersSummary = importScope.getByText("Folders created").parentElement
    const skippedDuplicatesSummary = importScope.getByText("Duplicates skipped").parentElement

    expect(importedFeedsSummary).not.toBeNull()
    expect(createdFoldersSummary).not.toBeNull()
    expect(skippedDuplicatesSummary).not.toBeNull()

    expect(within(importedFeedsSummary as HTMLElement).getByText("2")).toBeTruthy()
    expect(within(createdFoldersSummary as HTMLElement).getByText("2")).toBeTruthy()
    expect(within(skippedDuplicatesSummary as HTMLElement).getByText("2")).toBeTruthy()
  })

  test("exports the current subscription tree as OPML and round-trips it into the same structure", async () => {
    window.scrollTo = () => {}
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    const exportSection = within(sourcePane)
      .getByRole("heading", {
        name: "OPML export",
      })
      .closest("section")

    expect(exportSection).not.toBeNull()

    const exportScope = within(exportSection as HTMLElement)

    await user.click(exportScope.getByRole("button", { name: "Generate OPML" }))

    const exportedTextarea = exportScope.getByLabelText("Exported OPML") as HTMLTextAreaElement

    await waitFor(() => {
      expect(exportedTextarea.value).toContain(`<?xml version="1.0" encoding="UTF-8"?>`)
      expect(exportedTextarea.value).toContain(`text="Daily reading desk"`)
      expect(exportedTextarea.value).toContain(`xmlUrl="https://freelyrss.dev/feed.xml"`)
    })

    const feedsExportedSummary = exportScope.getByText("Feeds exported").parentElement
    const foldersExportedSummary = exportScope.getByText("Folders exported").parentElement

    expect(feedsExportedSummary).not.toBeNull()
    expect(foldersExportedSummary).not.toBeNull()
    expect(within(feedsExportedSummary as HTMLElement).getByText("5")).toBeTruthy()
    expect(within(foldersExportedSummary as HTMLElement).getByText("4")).toBeTruthy()

    const expectedStructure = buildShellStructure(await fetchReaderShellData())
    const exportedOpml = exportedTextarea.value

    resetMockReaderShellState({ mode: "empty" })

    const imported = await importMockOpml(exportedOpml)
    const importedStructure = buildShellStructure(imported.shellData)

    expect(imported.report.createdFeedCount).toBe(5)
    expect(imported.report.createdFolderCount).toBe(4)
    expect(imported.report.duplicateFeedCount).toBe(0)
    expect(importedStructure.folderPaths).toEqual(expectedStructure.folderPaths)
    expect(importedStructure.feedPaths).toEqual(expectedStructure.feedPaths)
  })
})
