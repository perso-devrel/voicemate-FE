import { api } from './api';
import type { DiscoverCandidate, SwipeRequest, SwipeResponse, DiscoverQuota } from '@/types';

export async function getDiscoverCandidates(limit = 10): Promise<DiscoverCandidate[]> {
  return api.get<DiscoverCandidate[]>(`/api/discover?limit=${limit}`);
}

export async function swipe(data: SwipeRequest): Promise<SwipeResponse> {
  return api.post<SwipeResponse>('/api/discover/swipe', data);
}

// BE 가 sources of truth 로 들고 있는 "오늘 스와이프 수" 를 가져온다 (기기 간 동기화).
// tz_offset_minutes 는 Date#getTimezoneOffset() 그대로 — 사용자 로컬 자정 경계를 BE 가 계산한다.
export async function getDiscoverQuota(): Promise<DiscoverQuota> {
  const tz = new Date().getTimezoneOffset();
  return api.get<DiscoverQuota>(`/api/discover/quota?tz_offset_minutes=${tz}`);
}
