// dev/QA 어드민 대시보드 — BE API 헬퍼.
//
// 인증:
//   * sessionStorage 의 'admin_secret' 을 모든 호출에 X-Admin-Secret 헤더로 첨부.
//   * 임퍼소네이션 시 X-Admin-Impersonate: <user_id> 헤더 추가
//     → BE authMiddleware 가 해당 dev 계정으로 req.userId 설정 → 기존 /api/* 라우트 그대로 사용.
//
// API_BASE:
//   * NEXT_PUBLIC_API_URL (예: http://localhost:3000) 에서 읽음.
//   * 미설정 시 localhost:3000 폴백.

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function getAdminSecret(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('admin_secret');
}

export function setAdminSecret(value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) sessionStorage.removeItem('admin_secret');
  else sessionStorage.setItem('admin_secret', value);
}

export class AdminApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function adminFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; impersonate?: string } = {},
): Promise<T> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new AdminApiError(401, 'No admin secret in session');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret,
  };
  if (opts.impersonate) {
    headers['X-Admin-Impersonate'] = opts.impersonate;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new AdminApiError(res.status, text || `HTTP ${res.status}`);
  }
  // 204 No Content 대응
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// 어드민 시크릿 검증 — 로그인 시 사용.
export async function verifyAdminSecret(secret: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/admin/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': secret,
    },
  });
  return res.ok;
}

// ----- 타입 -----

export type DevAccount = {
  user_id: string;
  email: string | null;
  persona_index: number | null;
  display_name: string | null;
  gender: 'male' | 'female' | 'other' | null;
  nationality: string | null;
  language: string | null;
  photo: string | null;
  voice_intro: string | null;
  voice_clone_status: string | null;
};

// BE GET /api/matches 응답 shape (haru_BE/src/routes/match.ts).
//   * id 는 match_id (auth 라우트 컨벤션과 다름 주의)
//   * partner 가 null 이면 상대 프로필이 삭제됨 (deleted_at)
//   * last_message 가 nested
//   * photos 는 partner 안에 있으며 photo_access 에 따라 1장 또는 전체
export type MatchSummary = {
  match_id: string;
  created_at: string;
  unmatched_at: string | null;
  partner: {
    id: string;
    display_name: string;
    nationality: string;
    language: string;
    photos: string[];
    deleted_at: string | null;
  } | null;
  photo_access: {
    main_photo_unlocked: boolean;
    all_photos_unlocked: boolean;
  };
  round_trip_count: number;
  last_message: {
    id: string;
    original_text: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  original_text: string;
  original_language: string;
  translated_text: string | null;
  translated_language: string | null;
  audio_url: string | null;
  audio_status: 'pending' | 'processing' | 'ready' | 'failed';
  emotion: string | null;
  // read-at-removal-list-mask sprint (mig 018): 옛 read_at 컬럼 제거. "읽음" 의미는
  // listened_at 단일 진실원.
  listened_at: string | null;
  created_at: string;
};

export type DiscoverCard = {
  id: string;
  display_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  language: string;
  voice_intro: string | null;
  voice_intro_audio_url: string | null;
  interests: string[];
  photos: string[];
};

// ----- 도메인 API 래퍼 -----

export async function listDevAccounts(): Promise<DevAccount[]> {
  const res = await adminFetch<{ accounts: DevAccount[] }>('/api/admin/accounts');
  return res.accounts;
}

export async function listMatches(asUserId: string): Promise<MatchSummary[]> {
  // 기존 GET /api/matches 는 응답 shape 가 평면 array 가 아니라 partner / last_message
  // 가 nested 된 RPC 결과 + match row 조합. 본 클라이언트는 BE 가 반환하는 그대로 받는다.
  return adminFetch<MatchSummary[]>('/api/matches', { impersonate: asUserId });
}

export async function listMessages(asUserId: string, matchId: string, limit = 50): Promise<Message[]> {
  // BE 는 DESC 정렬로 반환. 화면 표시는 ASC.
  const data = await adminFetch<Message[]>(
    `/api/matches/${matchId}/messages?limit=${limit}`,
    { impersonate: asUserId },
  );
  return [...data].reverse();
}

export async function sendMessage(asUserId: string, matchId: string, text: string): Promise<Message> {
  return adminFetch<Message>(`/api/matches/${matchId}/messages`, {
    method: 'POST',
    impersonate: asUserId,
    body: { text },
  });
}

// read-at-removal-list-mask sprint: markMessagesRead 함수 제거.
// PATCH /api/matches/:matchId/messages/read 라우트가 폐기되었고, "읽음" 의미는
// listened_at 단일 진실원으로 일원화됐다. admin 대시보드에서 일괄 read 마킹이
// 필요했던 동선 자체가 무의미해짐.

export async function getDiscover(asUserId: string, limit = 10): Promise<DiscoverCard[]> {
  return adminFetch<DiscoverCard[]>(`/api/discover?limit=${limit}`, { impersonate: asUserId });
}

export async function swipe(
  asUserId: string,
  swipedId: string,
  direction: 'like' | 'pass',
): Promise<{ matched?: boolean; match?: { id: string } } | unknown> {
  return adminFetch(`/api/discover/swipe`, {
    method: 'POST',
    impersonate: asUserId,
    body: { swiped_id: swipedId, direction },
  });
}
