import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import App from "../../App"
import { createAppQueryClient } from "../../app/query-client"
import { createAppRouter } from "../../app/router"
import { resetMockReaderShellState } from "./mock-data"
import { resetReaderViewStore } from "./state"

function renderDesktopShell() {
  window.scrollTo = () => {}
  render(<App queryClient={createAppQueryClient()} router={createAppRouter()} />)
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

  test("renders the three-column reader shell with sources, queue, and reading panel", async () => {
    renderDesktopShell()

    const sourcePane = await screen.findByRole("region", { name: "Sources" })
    expect(sourcePane).toBeTruthy()

    const queuePane = screen.getByRole("region", { name: "Article queue" })
    expect(queuePane).toBeTruthy()

    const readerPane = screen.getByRole("region", { name: "Reading panel" })
    expect(readerPane).toBeTruthy()
  })
})
