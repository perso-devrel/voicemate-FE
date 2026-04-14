import { api } from './api';
import type { DiscoverCandidate, SwipeRequest, SwipeResponse } from '@/types';

export async function getDiscoverCandidates(limit = 10): Promise<DiscoverCandidate[]> {
  return api.get<DiscoverCandidate[]>(`/api/discover?limit=${limit}`);
}

export async function swipe(data: SwipeRequest): Promise<SwipeResponse> {
  return api.post<SwipeResponse>('/api/discover/swipe', data);
}
