"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Show cached data instantly, refresh in background after 30 s
            staleTime: 30_000,
            // Keep unused data in cache for 5 minutes
            gcTime: 5 * 60_000,
            // Retry failed requests once
            retry: 1,
            // Refresh when the user switches back to the tab
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

