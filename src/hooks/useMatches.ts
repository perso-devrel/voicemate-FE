import { useState, useCallback, useRef } from 'react';
import * as matchService from '@/services/matches';
import * as blockService from '@/services/block';
import { photoAccessStore } from '@/stores/photoAccess';
import { DEFAULT_PHOTO_ACCESS } from '@/types/photoAccess';
import type { MatchListItem } from '@/types';

// Push each match's photo_access into the registry so any screen (Matches tab,
// Chat screen, profile detail) can render consistent blur state without the
// caller having to thread the flag down. undefined from BE → DEFAULT (locked).
function ingestMatches(matches: MatchListItem[]) {
  const entries = matches
    .map((m) => {
      const userId = m.partner?.id;
      if (!userId) return null;
      return { userId, access: m.photo_access ?? DEFAULT_PHOTO_ACCESS };
    })
    .filter((e): e is { userId: string; access: typeof DEFAULT_PHOTO_ACCESS } => e !== null);
  photoAccessStore.ingest(entries);
}

export function useMatches() {
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingMore = useRef(false);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await matchService.getMatches(20);
      ingestMatches(data);
      setMatches(data);
      setHasMore(data.length === 20);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore.current || !hasMore) return;
    loadingMore.current = true;
    try {
      const last = matches[matches.length - 1];
      if (!last) return;
      const data = await matchService.getMatches(20, last.created_at);
      ingestMatches(data);
      setMatches((prev) => [...prev, ...data]);
      setHasMore(data.length === 20);
    } catch (e: any) {
      setError(e.message);
    } finally {
      loadingMore.current = false;
    }
  }, [matches, hasMore]);

  // Block also auto soft-deletes the match server-side, so we drop the row
  // locally to keep the list in sync without an extra round-trip.
  const handleBlock = useCallback(async (matchId: string, blockedId: string) => {
    await blockService.blockUser(blockedId);
    setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
  }, []);

  return { matches, loading, hasMore, error, loadMatches, loadMore, handleBlock };
}
