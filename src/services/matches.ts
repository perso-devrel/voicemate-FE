import { api } from './api';
import { supabase } from './realtime';
import type { MatchListItem, PartnerDetail } from '@/types';

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

// BE's MatchPartner DTO omits birth_date/interests/bio_audio_url. We pull those
// directly from Supabase — RLS policy "Anyone can read active profiles" permits it.
export async function getPartnerDetail(userId: string): Promise<PartnerDetail | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('birth_date, interests, bio_audio_url')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    birth_date: data.birth_date ?? '',
    interests: (data.interests as string[]) ?? [],
    bio_audio_url: (data.bio_audio_url as string | null) ?? null,
  };
}
