import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as messageService from '@/services/messages';
import { subscribeToMessages, unsubscribeFromMessages } from '@/services/realtime';
import { useAuthStore } from '@/stores/authStore';
import { computeBackoffDelay } from '@/utils/backoff';
import { describeError } from '@/utils/errors';
import type { Emotion, Message } from '@/types';

export function useChat(matchId: string) {
  const userId = useAuthStore((s) => s.userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingMore = useRef(false);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await messageService.getMessages(matchId, 50);
      // API returns newest first, reverse for display (oldest at top)
      setMessages(data.reverse());
      setHasMore(data.length === 50);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const loadOlder = useCallback(async () => {
    if (loadingMore.current || !hasMore || messages.length === 0) return;
    loadingMore.current = true;
    try {
      // messages[0] is the oldest in our reversed list
      const oldest = messages[0];
      const data = await messageService.getMessages(matchId, 50, oldest.created_at);
      setMessages((prev) => [...data.reverse(), ...prev]);
      setHasMore(data.length === 50);
    } catch (e) {
      setError(describeError(e));
    } finally {
      loadingMore.current = false;
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
      );
    };

    connect();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        retryAttempt = 0;
        connect();
        loadMessages();
      }
    });

    return () => {
      cancelled = true;
      clearRetry();
      subscription.remove();
      unsubscribeFromMessages();
    };
  }, [matchId, loadMessages]);

  return {
    messages,
    loading,
    hasMore,
    error,
    userId,
    loadMessages,
    loadOlder,
    send,
    markRead,
    retryAudio,
  };
}
