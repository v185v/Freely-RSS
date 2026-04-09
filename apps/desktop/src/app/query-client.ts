import { QueryClient } from "@tanstack/react-query"

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })
}

export const appQueryClient = createAppQueryClient()
