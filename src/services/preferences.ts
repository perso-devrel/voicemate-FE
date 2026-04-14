import { api } from './api';
import type { UserPreference, PreferenceUpdateRequest } from '@/types';

export async function getPreferences(): Promise<UserPreference> {
  return api.get<UserPreference>('/api/preferences');
}

export async function updatePreferences(
  data: PreferenceUpdateRequest,
): Promise<UserPreference> {
  return api.put<UserPreference>('/api/preferences', data);
}
