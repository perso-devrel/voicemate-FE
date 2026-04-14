import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import { getAccessToken } from './api';
import type { Message } from '@/types';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let messageChannel: RealtimeChannel | null = null;

export function subscribeToMessages(
  matchId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void,
) {
  unsubscribeFromMessages();

  messageChannel = supabase
    .channel(`messages:${matchId}`)
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
    .subscribe();

  return messageChannel;
}

export function unsubscribeFromMessages() {
  if (messageChannel) {
    supabase.removeChannel(messageChannel);
    messageChannel = null;
  }
}

export async function setRealtimeAuth() {
  const token = await getAccessToken();
  if (token) {
    supabase.realtime.setAuth(token);
  }
}
