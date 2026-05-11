import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import useSWR from 'swr';
import * as messageService from '@/services/messages';
import {
  subscribeToMessages,
  unsubscribeFromMessages,
  type MatchUpdatePayload,
} from '@/services/realtime';
import { useAuthStore } from '@/stores/authStore';
import { matchesKey } from '@/lib/swr';
import { computeBackoffDelay } from '@/utils/backoff';
import { describeError } from '@/utils/errors';
import type { Emotion, MatchAfter, MatchListItem, Message } from '@/types';

// mig 014 match-roundtrip-realtime: useChat 이 노출하는 BE-sourced
// 친밀도/사진 잠금 상태. 클라이언트 윈도우 재계산(countRoundTrips) 대신
// trigger snapshot 을 single source of truth 로 사용한다.
export interface PhotoUnlockedSnapshot {
  main: boolean;
  all: boolean;
}

export function useChat(matchId: string) {
  const userId = useAuthStore((s) => s.userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchAfter, setMatchAfter] = useState<MatchAfter | null>(null);
  // chat-flatlist-pagination sprint: loadingMore was a ref so the inverted
  // FlatList had no way to surface a spinner while older pages were in flight.
  // Promoted to state (loadingOlder) and exposed below; a parallel ref is kept
  // for the concurrency guard inside loadOlder so re-entrancy is checked
  // synchronously without relying on async state propagation.
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);

  // useMatches 가 이미 채워둔 SWR 캐시에서 본 매치 row 를 selector 로 추출.
  // fetcher null + revalidate off — useChat 이 추가 네트워크 호출을 하지 않고
  // 캐시만 읽는다 (캐시 미스면 첫 send 응답까지 matchAfter 가 null 유지).
  const { data: matchesCache } = useSWR<MatchListItem[]>(
    userId ? matchesKey(userId) : null,
    null,
    {
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    },
  );

  // 마운트 시 / 캐시 갱신 시 — useMatches 의 photo_access 와 round_trip_count 로
  // 초기 시드. 캐시에 본 매치가 없으면 null 유지 → 첫 send 응답이 시드.
  useEffect(() => {
    if (matchAfter !== null) return;
    if (!matchesCache) return;
    const row = matchesCache.find((m) => m.match_id === matchId);
    if (!row) return;
    setMatchAfter({
      round_trip_count: row.round_trip_count,
      main_photo_unlocked: row.photo_access?.main_photo_unlocked ?? false,
      all_photos_unlocked: row.photo_access?.all_photos_unlocked ?? false,
    });
  }, [matchesCache, matchId, matchAfter]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await messageService.getMessages(matchId, 50);
      // API returns newest first, reverse for display (oldest at top).
      // chat-flatlist-pagination sprint: copy before reverse — in-place
      // mutation on the service response can desync ordering when React
      // StrictMode double-invokes the effect.
      setMessages([...data].reverse());
      setHasMore(data.length === 50);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMore || messages.length === 0) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      // messages[0] is the oldest in our reversed list
      const oldest = messages[0];
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[useChat] loadOlder: requesting before=', oldest.created_at);
      }
      const data = await messageService.getMessages(matchId, 50, oldest.created_at);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[useChat] loadOlder: received', data.length, 'older messages');
      }
      // chat-flatlist-pagination sprint: copy before reverse — see loadMessages.
      setMessages((prev) => [...[...data].reverse(), ...prev]);
      setHasMore(data.length === 50);
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[useChat] loadOlder: ERROR', describeError(e));
      }
      setError(describeError(e));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [matchId, messages, hasMore]);

  const send = useCallback(async (text: string, emotion?: Emotion) => {
    setError(null);
    try {
      const msg = await messageService.sendMessage(matchId, text, emotion);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // mig 014: BE trigger 가 갱신한 matches snapshot 을 응답에서 즉시 시드.
      // 구버전 BE 응답은 match_after 가 undefined — 그 경우 기존 state 유지.
      if (msg.match_after) {
        setMatchAfter(msg.match_after);
      }
      return msg;
    } catch (e) {
      setError(describeError(e));
      throw e;
    }
  }, [matchId]);

  const markRead = useCallback(async () => {
    try {
      await messageService.markAsRead(matchId);
    } catch {
      // silent fail for read receipts
    }
  }, [matchId]);

  const retryAudio = useCallback(async (messageId: string) => {
    await messageService.retryAudio(messageId);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, audio_status: 'processing' as const } : m,
      ),
    );
  }, []);

  // Subscribe to Realtime + reconnect on foreground or after error
  useEffect(() => {
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
      await subscribeToMessages(
        matchId,
        (newMsg) => {
          if (cancelled) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
        (updatedMsg) => {
          if (cancelled) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
          );
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
        // mig 014 match-roundtrip-realtime: matches UPDATE 핸들러. 트리거가
        // 갱신한 round_trip_count / *_unlocked_at 변화를 단일 채널로 수신.
        // 상대방 발신으로 페어 +1 시 본 경로로 게이지가 갱신된다.
        (payload: MatchUpdatePayload) => {
          if (cancelled) return;
          setMatchAfter({
            round_trip_count: payload.round_trip_count ?? 0,
            main_photo_unlocked: payload.main_photo_unlocked_at !== null,
            all_photos_unlocked: payload.all_photos_unlocked_at !== null,
          });
        },
      );
    };

    connect();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // chat-flatlist-pagination sprint: previously also called
        // loadMessages() here, but that wiped any history the user had
        // paginated into during the session and reset hasMore. Realtime
        // re-subscription via connect() is enough to resume live receive;
        // catching up missed-while-backgrounded messages is out of scope
        // and would need a since-cursor fetch (not a full reload).
        retryAttempt = 0;
        connect();
      }
    });

    return () => {
      cancelled = true;
      clearRetry();
      subscription.remove();
      unsubscribeFromMessages();
    };
    // chat-flatlist-pagination sprint: loadMessages was removed from this
    // effect body (AppState 'active' no longer reloads), so it's no longer
    // a dependency. Keeping only matchId — the effect's true input.
  }, [matchId]);

  return {
    messages,
    loading,
    // chat-flatlist-pagination sprint: exposed so the chat screen can render
    // a footer spinner while older pages are in flight (inverted list → the
    // spinner sits at the visual TOP, exactly where the user is scrolling).
    loadingOlder,
    hasMore,
    error,
    userId,
    // mig 014 match-roundtrip-realtime: BE-sourced 친밀도/사진 잠금.
    // null = 마운트 직후 매치 캐시도 없고 첫 send 응답도 없는 cold start.
    // 호출처는 `roundTrips ?? 0` 으로 안전하게 처리.
    roundTrips: matchAfter ? matchAfter.round_trip_count : null,
    photoUnlocked: matchAfter
      ? ({
          main: matchAfter.main_photo_unlocked,
          all: matchAfter.all_photos_unlocked,
        } satisfies PhotoUnlockedSnapshot)
      : null,
    loadMessages,
    loadOlder,
    send,
    markRead,
    retryAudio,
  };
}
