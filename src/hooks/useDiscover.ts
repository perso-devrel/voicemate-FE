import { useState, useCallback } from 'react';
import * as discoverService from '@/services/discover';
import { photoAccessStore } from '@/stores/photoAccess';
import { DEFAULT_PHOTO_ACCESS } from '@/types/photoAccess';
import type { DiscoverCandidate, SwipeResponse } from '@/types';

// Discover candidates are always fully locked by policy — FE forces blur. We
// still ingest to keep the registry coherent across tabs.
function ingestCandidates(candidates: DiscoverCandidate[]) {
  const entries = candidates
    .filter((c) => Boolean(c.id))
    .map((c) => ({ userId: c.id, access: c.photo_access ?? DEFAULT_PHOTO_ACCESS }));
  photoAccessStore.ingest(entries);
}

export function useDiscover() {
  const [candidates, setCandidates] = useState<DiscoverCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async (limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverService.getDiscoverCandidates(limit);
      ingestCandidates(data);
      setCandidates(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSwipe = useCallback(async (
    swipedId: string,
    direction: 'like' | 'pass',
  ): Promise<SwipeResponse | null> => {
    try {
      const res = await discoverService.swipe({ swiped_id: swipedId, direction });
      setCandidates((prev) => prev.filter((c) => c.id !== swipedId));
      return res;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  return { candidates, loading, error, loadCandidates, handleSwipe };
}
