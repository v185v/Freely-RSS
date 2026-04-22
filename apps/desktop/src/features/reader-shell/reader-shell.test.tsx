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
    })

    await user.click(reopenedEditorScope.getByRole("button", { name: "Manual refresh" }))

    await waitFor(() => {
      expect(reopenedEditorScope.getAllByText("healthy").length).toBeGreaterThan(0)
      expect(reopenedEditorScope.queryByText(/malformed XML near the channel header/i)).toBeNull()
    })
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
