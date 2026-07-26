'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60 seconds - data stays fresh for 1 minute
            retry: 1,
            // Do NOT set global refetchInterval — each component sets its own.
            // Global refetchInterval causes ALL queries to poll constantly,
            // creating cascading re-renders and infinite update loops.
            refetchOnWindowFocus: false, // Disable to prevent mass re-fetch on tab switch
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
