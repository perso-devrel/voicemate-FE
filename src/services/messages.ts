import { api } from './api';
import type {
  Emotion,
  Message,
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
  // chat-audio-async-insert sprint: 응답은 두 가지 경로.
  //   * voice clone 보유 발신자 → 202 stub Message (audio_status='pending',
  //     id 는 확정된 UUID — realtime INSERT 가 같은 id 로 도착 → useChat
  //     이 같은 id 로 replace).
  //   * voice clone 없는 발신자 → 201 동기 INSERT Message.
  // 응답 타입은 동일 Message 모양이므로 호출처는 분기 불필요.
  const body: { text: string; emotion?: Emotion } =
    emotion && emotion !== 'neutral' ? { text, emotion } : { text };
  return api.post<SendMessageResponse>(`/api/matches/${matchId}/messages`, body);
}

// read-at-removal-list-mask sprint: markAsRead 함수 제거.
// "읽음" 의 의미가 listened_at (음성 청취 완료) 으로 일원화되면서 PATCH
// /messages/read 라우트가 사라졌고, 일괄 마킹 동선 자체가 폐기됐다. 메시지별
// 청취 마킹은 markMessageListened 가 단일 진실원.

// chat-audio-async-insert sprint: retryAudio 함수 제거.
// 실패한 메시지는 audio_url=null, audio_status='failed' 로 영구 저장되며
// 사용자는 동일 텍스트로 새 메시지를 보내 재시도한다.

// voice-first-message-gate sprint: 수신자가 메시지 음성을 1회 끝까지 재생
// 했음을 서버에 마킹. idempotent — 같은 messageId 로 여러 번 호출돼도 BE 가
// 처음 한 번만 실제 UPDATE. 실패해도 다음 realtime UPDATE 동기화로 결국
// 정합화되므로 호출처는 fire-and-forget 패턴 권장.
export async function markMessageListened(
  matchId: string,
  messageId: string,
): Promise<Message> {
  return api.post<Message>(
    `/api/matches/${matchId}/messages/${messageId}/listened`,
  );
}
