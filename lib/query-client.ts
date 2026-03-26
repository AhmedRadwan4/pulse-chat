import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set staleTime > 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000
      }
    }
  })
}
