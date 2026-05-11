import { api } from './api';
import type {
  Emotion,
  Message,
  ReadResponse,
  RetryResponse,
  SendMessageResponse,
} from '@/types';

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
  emotion?: Emotion,
): Promise<SendMessageResponse> {
  // BE accepts neutral and stores it as null; omit the field when neutral so
  // the request body stays minimal.
  // mig 014 match-roundtrip-realtime: 응답 타입을 SendMessageResponse 로 확장 —
  // 트리거가 갱신한 matches snapshot 이 `match_after` 필드로 동봉된다.
  // 구버전 BE 호환을 위해 match_after 는 optional 이며, 본 함수는 단순 통과.
  const body: { text: string; emotion?: Emotion } =
    emotion && emotion !== 'neutral' ? { text, emotion } : { text };
  return api.post<SendMessageResponse>(`/api/matches/${matchId}/messages`, body);
}

export async function markAsRead(matchId: string): Promise<ReadResponse> {
  return api.patch<ReadResponse>(`/api/matches/${matchId}/messages/read`);
}

export async function retryAudio(messageId: string): Promise<RetryResponse> {
  return api.post<RetryResponse>(`/api/matches/${messageId}/retry`);
}
