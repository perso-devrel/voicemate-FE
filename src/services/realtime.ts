import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import { getAccessToken, getRefreshToken } from './api';
import type { Message } from '@/types';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let messageChannel: RealtimeChannel | null = null;

/**
 * Status value reported by supabase-js on the `.subscribe()` callback.
 * Kept here so the chat hook can narrow without reaching into
 * supabase-js's private types.
 */
export type RealtimeChannelStatus =
  | 'SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED';

export async function subscribeToMessages(
  matchId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void,
  onStatusChange?: (status: RealtimeChannelStatus, err?: Error) => void,
) {
  await unsubscribeFromMessages();
  await setRealtimeAuth();

  messageChannel = supabase
    .channel(`messages_${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        onMessageUpdate(payload.new as Message);
      },
    )
    .subscribe((status, err) => {
      if (__DEV__) {
        console.log(`[Realtime ${matchId}]`, status, err ?? '');
      }
      onStatusChange?.(status as RealtimeChannelStatus, err);
    });

  return messageChannel;
}

export async function unsubscribeFromMessages() {
  if (messageChannel) {
    await supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
}

export async function setRealtimeAuth() {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
}
