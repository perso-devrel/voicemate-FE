import { api } from './api';
import type { MatchListItem } from '@/types';

export async function getMatches(
  limit = 20,
  before?: string,
): Promise<MatchListItem[]> {
  let path = `/api/matches?limit=${limit}`;
  if (before) path += `&before=${encodeURIComponent(before)}`;
  return api.get<MatchListItem[]>(path);
}

export async function unmatch(matchId: string): Promise<{ status: string }> {
  return api.delete<{ status: string }>(`/api/matches/${matchId}`);
}
