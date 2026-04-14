import { useState, useCallback } from 'react';
import * as prefService from '@/services/preferences';
import type { UserPreference, PreferenceUpdateRequest } from '@/types';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await prefService.getPreferences();
      setPreferences(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (data: PreferenceUpdateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await prefService.updatePreferences(data);
      setPreferences(updated);
      return updated;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { preferences, loading, error, loadPreferences, updatePreferences };
}
