import { ThemeRoot } from "@freelyrss/ui"
import type { QueryClient } from "@tanstack/react-query"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"

import { appQueryClient } from "./app/query-client"
import { appRouter } from "./app/router"

type AppProps = {
  queryClient?: QueryClient
  router?: typeof appRouter
}

function App({ queryClient = appQueryClient, router = appRouter }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRoot>
        <RouterProvider router={router} />
      </ThemeRoot>
    </QueryClientProvider>
  )
}

export default App
