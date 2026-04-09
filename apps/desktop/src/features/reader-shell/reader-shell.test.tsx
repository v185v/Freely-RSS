import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test } from "vitest"

import App from "../../App"
import { createAppQueryClient } from "../../app/query-client"
import { createAppRouter } from "../../app/router"

describe("reader shell navigation", () => {
  afterEach(() => {
    cleanup()
    window.history.pushState({}, "", "/")
  })

  test("reconciles stale article selection when switching through an empty route", async () => {
    window.scrollTo = () => {}
    window.history.pushState({}, "", "/?sourceId=feed-night-audio&articleId=article-layout-shell")

    render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)

    await screen.findByRole("heading", { name: "Night Audio Digest" })
    await screen.findByText("No placeholder articles are visible for this route yet.")

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=feed-night-audio")
      expect(window.location.search).not.toContain("article-layout-shell")
    })

    const primaryNavigation = screen.getByRole("navigation", {
      name: "Primary reader navigation",
    })

    await userEvent.click(within(primaryNavigation).getByRole("button", { name: /Unread desk/i }))

    await screen.findByRole("heading", {
      name: "Turning the desktop shell into a stable three-pane reader skeleton",
    })

    await waitFor(() => {
      expect(window.location.search).toContain("sourceId=view-unread")
      expect(window.location.search).toContain("articleId=article-layout-shell")
    })
  })
})
