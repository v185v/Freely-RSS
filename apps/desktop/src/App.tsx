import { ThemeRoot } from "@freelyrss/ui"
import type { QueryClient } from "@tanstack/react-query"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"

import { appQueryClient } from "./app/query-client"
import { appRouter } from "./app/router"
import { useReaderViewStore } from "./features/reader-shell/state"

type AppProps = {
  queryClient?: QueryClient
  router?: typeof appRouter
}

function App({ queryClient = appQueryClient, router = appRouter }: AppProps) {
  const themeTone = useReaderViewStore((state) => state.themeTone)

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRoot tone={themeTone}>
        <RouterProvider router={router} />
      </ThemeRoot>
    </QueryClientProvider>
  )
}

export default App
