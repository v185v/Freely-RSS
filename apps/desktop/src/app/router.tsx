import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"

import { ReaderShellRoute, validateReaderSearch } from "../features/reader-shell/reader-shell-route"

function RootLayout() {
  return <Outlet />
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const readerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: validateReaderSearch,
  component: ReaderShellRoute,
})

const routeTree = rootRoute.addChildren([readerRoute])

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
  })
}

export const appRouter = createAppRouter()

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof appRouter
  }
}
