import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import * as matchService from '@/services/matches';
import {
  subscribeToAllMessages,
  unsubscribeFromAllMessages,
} from '@/services/realtime';
import { photoAccessStore } from '@/stores/photoAccess';
import { useAuthStore } from '@/stores/authStore';
import { computeBackoffDelay } from '@/utils/backoff';
import { DEFAULT_PHOTO_ACCESS } from '@/types/photoAccess';
import type { Message, MatchListItem } from '@/types';

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

// Apply a freshly-arrived message to the matches list state without a full
// network re-fetch. The row's last_message becomes the new message and its
// unread_count bumps when the message is from the partner (the chat screen's
// markRead/realtime path keeps own-sent messages from triggering a bump).
function applyIncomingMessage(
  prev: MatchListItem[],
  message: Message,
  myUserId: string | null,
): MatchListItem[] {
  const idx = prev.findIndex((m) => m.match_id === message.match_id);
  if (idx === -1) return prev; // Message for a match we haven't loaded yet.
  const row = prev[idx];
  const isMine = myUserId !== null && message.sender_id === myUserId;
  // Don't double-count: postgres_changes can re-fire on reconnect, and the
  // chat-screen channel may also trigger when both views are mounted. Keep
  // the latest message id so the row's last_message stays correct.
  if (row.last_message?.id === message.id) {
    return prev;
  }
  const next: MatchListItem = {
    ...row,
    last_message: {
      id: message.id,
      original_text: message.original_text,
      sender_id: message.sender_id,
      created_at: message.created_at,
    },
    unread_count: isMine ? row.unread_count : row.unread_count + 1,
  };
  // Hoist the row to the top — the matches list orders by latest activity
  // and the rest of the page expects newest first.
  return [next, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
}

export function useMatches() {
  const myUserId = useAuthStore((s) => s.userId);
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

  // List-level Realtime subscription: mirror the per-match pattern from
  // chat/[matchId].tsx so the matches tab shows fresh last_message + unread
  // counts without a manual pull-to-refresh.
  //
  // RLS restricts the INSERT events to messages in matches the user is part
  // of, so the unfiltered subscription is safe. The handler ignores messages
  // for matches not yet in the local list (those will appear next time
  // loadMatches() runs — typically when the user pulls to refresh or the
  // app foregrounds).
  useEffect(() => {
    if (!myUserId) return;
    let cancelled = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const connect = async () => {
      clearRetry();
      await subscribeToAllMessages(
        (message) => {
          if (cancelled) return;
          setMatches((prev) => applyIncomingMessage(prev, message, myUserId));
        },
        (status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            retryAttempt = 0;
            return;
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const delay = computeBackoffDelay(retryAttempt);
            retryAttempt += 1;
            clearRetry();
            retryTimer = setTimeout(() => {
              if (!cancelled) connect();
            }, delay);
          }
        },
      );
    };

    connect();

    // Foregrounding can drop the realtime socket on Android; reconnect and
    // re-fetch so the user sees up-to-date rows after a long backgrounded
    // pause. Mirrors the chat-screen pattern.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        retryAttempt = 0;
        connect();
        loadMatches();
      }
    });

    return () => {
      cancelled = true;
      clearRetry();
      subscription.remove();
      unsubscribeFromAllMessages();
    };
  }, [myUserId, loadMatches]);

  return { matches, loading, hasMore, error, loadMatches, loadMore };
}
