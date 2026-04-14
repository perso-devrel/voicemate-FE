import { useState, useCallback } from 'react';
import * as discoverService from '@/services/discover';
import type { DiscoverCandidate, SwipeResponse } from '@/types';

export function useDiscover() {
  const [candidates, setCandidates] = useState<DiscoverCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidates = useCallback(async (limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverService.getDiscoverCandidates(limit);
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
