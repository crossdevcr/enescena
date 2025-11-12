"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache time: 10 minutes  
            gcTime: 10 * 60 * 1000,
            // Retry on failure
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors except 408, 429
              if (typeof error === 'object' && error !== null && 'status' in error) {
                const status = (error as { status?: number }).status;
                if (status && status >= 400 && status < 500 && ![408, 429].includes(status)) {
                  return false;
                }
              }
              return failureCount < 3;
            },
            // Refetch on window focus for important data
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools 
        initialIsOpen={false} 
        buttonPosition="bottom-left"
      />
    </QueryClientProvider>
  );
}