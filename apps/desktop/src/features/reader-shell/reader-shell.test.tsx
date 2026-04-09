import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test } from "vitest"

import App from "../../App"
import { createAppQueryClient } from "../../app/query-client"
import { createAppRouter } from "../../app/router"
import { resetReaderViewStore } from "./state"

describe("reader shell navigation", () => {
  afterEach(() => {
    cleanup()
    resetReaderViewStore()
    window.history.pushState({}, "", "/")
  })

  test("reconciles stale article selection when switching through an empty route", async () => {
    window.scrollTo = () => {}
    window.history.pushState({}, "", "/?sourceId=feed-night-audio&articleId=article-layout-shell")
    const user = userEvent.setup()

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    await screen.findAllByText("Night Audio Digest")
    await screen.findByText("No placeholder articles are visible for this route yet.")

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-night-audio")
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
})
