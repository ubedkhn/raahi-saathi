import { QueryClient } from '@tanstack/react-query';
import { setCache, getCache, getAllCache, syncQueuedMutations } from './offlineQueue';
import { supabase } from '@/integrations/supabase/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const CACHEABLE_KEYS = ['profile', 'rides', 'bookings', 'vehicles', 'notifications'];

function shouldCache(queryKey: unknown[]): boolean {
  const key = JSON.stringify(queryKey);
  return CACHEABLE_KEYS.some((k) => key.includes(k));
}

// Set up IndexedDB persistence
if (typeof window !== 'undefined') {
  // Restore from IndexedDB on init
  getAllCache().then((cached) => {
    Object.entries(cached).forEach(([key, value]) => {
      try {
        const queryKey = JSON.parse(key);
        queryClient.setQueryData(queryKey, value);
      } catch (e) {
        console.warn('Failed to restore cache entry:', e);
      }
    });
  }).catch((e) => console.warn('Failed to restore IndexedDB cache:', e));

  // Save to IndexedDB on changes
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' || event.type === 'added') {
      const query = event.query;
      if (query.state.data !== undefined && shouldCache(query.queryKey)) {
        const key = JSON.stringify(query.queryKey);
        setCache(key, query.state.data).catch((e) => console.warn('Failed to cache:', e));
      }
    }
  });

  // Sync queued mutations when back online
  window.addEventListener('online', () => {
    syncQueuedMutations(supabase).then(() => {
      queryClient.invalidateQueries();
    }).catch((e) => console.warn('Sync failed:', e));
  });
}
