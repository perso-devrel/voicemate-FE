import { api } from './api';
import type { Message, ReadResponse, RetryResponse } from '@/types';

export async function getMessages(
  matchId: string,
  limit = 50,
  before?: string,
): Promise<Message[]> {
  let path = `/api/matches/${matchId}/messages?limit=${limit}`;
  if (before) path += `&before=${encodeURIComponent(before)}`;
  return api.get<Message[]>(path);
}

export async function sendMessage(
  matchId: string,
  text: string,
): Promise<Message> {
  return api.post<Message>(`/api/matches/${matchId}/messages`, { text });
}

export async function markAsRead(matchId: string): Promise<ReadResponse> {
  return api.patch<ReadResponse>(`/api/matches/${matchId}/messages/read`);
}

export async function retryAudio(messageId: string): Promise<RetryResponse> {
  return api.post<RetryResponse>(`/api/matches/${messageId}/retry`);
}
