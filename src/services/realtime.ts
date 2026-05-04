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
// Separate channel used by the matches list to react to message INSERTs
// across ALL the user's matches at once. Kept distinct from `messageChannel`
// so opening a chat (per-match channel) and the matches tab (all-matches
// channel) don't fight over the same singleton.
let matchesListChannel: RealtimeChannel | null = null;

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

// Matches-list-level subscription. Listens to message INSERTs without a
// match_id filter; RLS already restricts what the client can see to messages
// in matches the user is part of. Used by the matches tab so a row's
// last_message + unread_count refreshes the moment a new message arrives,
// without the user having to pull-to-refresh.
//
// This channel is separate from `subscribeToMessages` (per-match) so a chat
// screen open at the same time as the matches tab doesn't have its singleton
// stolen — both can coexist.
export async function subscribeToAllMessages(
  onNewMessage: (message: Message) => void,
  onStatusChange?: (status: RealtimeChannelStatus, err?: Error) => void,
) {
  await unsubscribeFromAllMessages();
  await setRealtimeAuth();

  matchesListChannel = supabase
    .channel('messages_all')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      },
    )
    .subscribe((status, err) => {
      if (__DEV__) {
        console.log('[Realtime messages_all]', status, err ?? '');
      }
      onStatusChange?.(status as RealtimeChannelStatus, err);
    });

  return matchesListChannel;
}

export async function unsubscribeFromAllMessages() {
  if (matchesListChannel) {
    await supabase.removeChannel(matchesListChannel);
    matchesListChannel = null;
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
