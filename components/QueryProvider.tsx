"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // App-wide cache baseline (cost + perceived performance). Without defaults,
  // every query refetches on each mount/focus — redundant Supabase/API calls on
  // mobile. These are conservative and are OVERRIDDEN by any call-site options
  // (e.g. the memories list sets its own staleTime), so existing behavior is
  // preserved; they only set a sensible floor for current/future consumers.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // serve cache for 1 min → instant revisits, fewer calls
            gcTime: 5 * 60_000, // keep unused cache 5 min
            refetchOnWindowFocus: false, // mobile: don't refetch on every app focus
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}