import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as profileService from '@/services/profile';
import type { ProfileUpsertRequest, PhotoUploadResponse, PhotoDeleteResponse } from '@/types';

export function useProfile() {
  const { profile, loadProfile, setProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upsertProfile = useCallback(async (data: ProfileUpsertRequest) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await profileService.upsertProfile(data);
      setProfile(updated);
      return updated;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [setProfile]);

  const uploadPhoto = useCallback(async (uri: string): Promise<PhotoUploadResponse> => {
    setLoading(true);
    setError(null);
    try {
      const res = await profileService.uploadPhoto(uri);
      await loadProfile();
      return res;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const deletePhoto = useCallback(async (index: number): Promise<PhotoDeleteResponse> => {
    setLoading(true);
    setError(null);
    try {
      const res = await profileService.deletePhoto(index);
      await loadProfile();
      return res;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  return { profile, loading, error, upsertProfile, uploadPhoto, deletePhoto, loadProfile };
}
