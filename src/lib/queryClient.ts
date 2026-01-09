import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Set up localStorage persistence for offline support
if (typeof window !== 'undefined') {
  const CACHE_KEY = 'raahi-query-cache';
  
  // Restore from localStorage on init
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      // Hydrate the cache
      Object.entries(data).forEach(([key, value]) => {
        const queryKey = JSON.parse(key);
        queryClient.setQueryData(queryKey, value);
      });
    } catch (e) {
      console.warn('Failed to restore query cache:', e);
    }
  }

  // Save to localStorage on changes
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' || event.type === 'added') {
      const cache: Record<string, unknown> = {};
      queryClient.getQueryCache().getAll().forEach((query) => {
        if (query.state.data !== undefined) {
          // Only cache profile and rides data
          const key = JSON.stringify(query.queryKey);
          if (key.includes('profile') || key.includes('rides') || key.includes('bookings') || key.includes('vehicles')) {
            cache[key] = query.state.data;
          }
        }
      });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (e) {
        console.warn('Failed to save query cache:', e);
      }
    }
  });
}
