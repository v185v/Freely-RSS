import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"

import { WebApp } from "./web-app"

test("renders the remote read-only web entry", async () => {
  render(<WebApp />)

  expect(await screen.findByRole("heading", { name: "FreelyRSS Web" })).toBeTruthy()
  expect(await screen.findByText("Remote read-only entry")).toBeTruthy()
  expect(screen.getByText("reader@example.com")).toBeTruthy()
  expect(screen.getByRole("main").getAttribute("data-scope-mode")).toBe("remote-sync-access")
  expect(screen.getByRole("main").getAttribute("data-scope-blockers")).toBe("0")
})

test("filters synchronized articles without desktop commands", async () => {
  const user = userEvent.setup()

  render(<WebApp />)

  await screen.findByRole("heading", { name: "FreelyRSS Web" })
  await user.type(screen.getByLabelText("Search remote snapshot"), "podcast")

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /Podcast metadata can be inspected remotely/ }),
    ).toBeTruthy()
  })
  expect(screen.queryByRole("button", { name: /Search in the browser should query/ })).toBeNull()
})

test("does not render desktop-only web controls", async () => {
  render(<WebApp />)

  await screen.findByRole("heading", { name: "FreelyRSS Web" })

  expect(screen.queryByRole("button", { name: /refresh feed/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /import opml/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /generate insights/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /dispatch webhook/i })).toBeNull()
  expect(screen.queryByRole("button", { name: /export knowledge base/i })).toBeNull()
})
