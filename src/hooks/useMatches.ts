import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import useSWR from 'swr';
import * as matchService from '@/services/matches';
import {
  subscribeToAllMessages,
  subscribeToAllMatchUpdates,
  unsubscribeFromAllMessages,
  unsubscribeFromAllMatchUpdates,
  type MatchUpdatePayload,
} from '@/services/realtime';
import { photoAccessStore } from '@/stores/photoAccess';
import { useAuthStore } from '@/stores/authStore';
import { matchesKey } from '@/lib/swr';
import { computeBackoffDelay } from '@/utils/backoff';
import { DEFAULT_PHOTO_ACCESS } from '@/types/photoAccess';
import type { Message, MatchListItem } from '@/types';

const PAGE_SIZE = 20;

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

// mig 014 match-roundtrip-realtime: matches UPDATE payload 를 리스트 row 에 머지.
// 014c 트리거가 갱신한 round_trip_count / *_unlocked_at 변화 + photoAccessStore
// 동기화. payload 의 match 가 캐시에 없으면 prev 를 그대로 반환 (no-op).
function applyMatchUpdate(
  prev: MatchListItem[],
  update: MatchUpdatePayload,
): MatchListItem[] {
  const idx = prev.findIndex((m) => m.match_id === update.id);
  if (idx === -1) return prev;
  const row = prev[idx];
  const nextAccess = {
    main_photo_unlocked: update.main_photo_unlocked_at !== null,
    all_photos_unlocked: update.all_photos_unlocked_at !== null,
  };
  // 백필 실패 매치(NULL)는 0 으로 정규화 — BE GET /api/matches 와 동일 규칙.
  const nextRT = update.round_trip_count ?? 0;
  // photo_access 가 달라지지 않고 카운트도 그대로면 새 row 객체 생성 회피
  // (FlatList re-render 절약).
  if (
    row.round_trip_count === nextRT &&
    (row.photo_access?.main_photo_unlocked ?? false) === nextAccess.main_photo_unlocked &&
    (row.photo_access?.all_photos_unlocked ?? false) === nextAccess.all_photos_unlocked &&
    row.unmatched_at === update.unmatched_at
  ) {
    return prev;
  }
  const next: MatchListItem = {
    ...row,
    round_trip_count: nextRT,
    photo_access: nextAccess,
    unmatched_at: update.unmatched_at,
  };
  return [...prev.slice(0, idx), next, ...prev.slice(idx + 1)];
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
  const swrKey = myUserId ? matchesKey(myUserId) : null;

  const {
    data,
    mutate,
    isValidating,
    error: swrError,
  } = useSWR<MatchListItem[]>(
    swrKey,
    () => matchService.getMatches(PAGE_SIZE),
    { onSuccess: ingestMatches },
  );

  const [extraPages, setExtraPages] = useState<MatchListItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const loadingMore = useRef(false);
  // Mirror state into refs so loadMore can read the freshest cursor without
  // depending on closure values. Prevents the rare race where extraPages was
  // just reset by a focus-revalidate but the closure still sees the old tail.
  const dataRef = useRef<MatchListItem[] | undefined>(data);
  const extraPagesRef = useRef<MatchListItem[]>(extraPages);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    extraPagesRef.current = extraPages;
  }, [extraPages]);

  // Drop the paginated tail whenever the first page revalidates — its cursors
  // are stale relative to the new head and would re-fetch overlapping rows.
  // Side effect: a focus-triggered revalidate resets pages 2+ that the user
  // had loaded. Acceptable trade-off — fresh head matters more than scroll
  // position, and SWR's dedupingInterval absorbs same-second revalidates.
  useEffect(() => {
    if (data) {
      setExtraPages([]);
      setHasMore(data.length === PAGE_SIZE);
    }
  }, [data]);

  const matches = data ? [...data, ...extraPages] : [];

  const loadMatches = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const loadMore = useCallback(async () => {
    if (loadingMore.current || !hasMore) return;
    loadingMore.current = true;
    try {
      const tailExtra = extraPagesRef.current;
      const tailData = dataRef.current;
      const tail =
        tailExtra.length > 0
          ? tailExtra[tailExtra.length - 1]
          : tailData?.[tailData.length - 1];
      if (!tail) return;
      const newPage = await matchService.getMatches(PAGE_SIZE, tail.created_at);
      ingestMatches(newPage);
      setExtraPages((prev) => [...prev, ...newPage]);
      setHasMore(newPage.length === PAGE_SIZE);
    } catch (e: any) {
      setLoadMoreError(e.message);
    } finally {
      loadingMore.current = false;
    }
  }, [hasMore]);

  // List-level Realtime subscription: mirror the per-match pattern from
  // chat/[matchId].tsx so the matches tab shows fresh last_message + unread
  // counts without a manual pull-to-refresh.
  //
  // RLS restricts the INSERT events to messages in matches the user is part
  // of, so the unfiltered subscription is safe. The patch only touches the
  // SWR-owned first page; messages for paginated rows surface on next
  // revalidate (older pages are by-definition less active).
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
          // Patch both the SWR-owned first page and the locally-paginated tail.
          // Either set is a no-op if the message's match isn't in that slice
          // (applyIncomingMessage returns prev unchanged on idx === -1), so
          // exactly one of the two updates fires per message.
          mutate(
            (prev) => applyIncomingMessage(prev ?? [], message, myUserId),
            { revalidate: false },
          );
          setExtraPages((prev) => applyIncomingMessage(prev, message, myUserId));
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

    // Foregrounding on Android can drop the realtime socket. SWR's initFocus
    // re-validates the list itself; we only need to re-establish the socket.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        retryAttempt = 0;
        connect();
      }
    });

    return () => {
      cancelled = true;
      clearRetry();
      subscription.remove();
      unsubscribeFromAllMessages();
    };
  }, [myUserId, mutate]);

  // mig 014 match-roundtrip-realtime: 리스트 화면용 matches UPDATE 구독.
  // 트리거가 갱신한 round_trip_count / *_unlocked_at 변화를 실시간으로 머지.
  // per-match 채널과 분리되어 있어 채팅 화면이 열린 상태에서도 독립 동작.
  // RLS 가 본인 매치만 통과시키므로 필터 없이 구독.
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
      await subscribeToAllMatchUpdates(
        (payload) => {
          if (cancelled) return;
          mutate(
            (prev) => applyMatchUpdate(prev ?? [], payload),
            { revalidate: false },
          );
          setExtraPages((prev) => applyMatchUpdate(prev, payload));
          // photoAccessStore 동기화 — partner.id 는 update payload 에 없으므로
          // 현 캐시에서 매치를 찾아 추출. downgrade guard 가 잠금 역행 차단.
          const cached = dataRef.current?.find((m) => m.match_id === payload.id)
            ?? extraPagesRef.current.find((m) => m.match_id === payload.id);
          const partnerUserId = cached?.partner?.id;
          if (partnerUserId) {
            photoAccessStore.update(partnerUserId, {
              main_photo_unlocked: payload.main_photo_unlocked_at !== null,
              all_photos_unlocked: payload.all_photos_unlocked_at !== null,
            });
          }
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

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        retryAttempt = 0;
        connect();
      }
    });

    return () => {
      cancelled = true;
      clearRetry();
      subscription.remove();
      unsubscribeFromAllMatchUpdates();
    };
  }, [myUserId, mutate]);

  const error = swrError ? (swrError as Error).message : loadMoreError;

  return { matches, loading: isValidating, hasMore, error, loadMatches, loadMore };
}
