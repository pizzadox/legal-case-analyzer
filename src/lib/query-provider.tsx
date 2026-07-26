'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds - reasonable stale time
            retry: 1,
            refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds (polling for DB changes)
            refetchOnWindowFocus: true, // Refresh when user switches back to the window
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
