import { useState, useCallback, useRef, useEffect } from 'react';
import * as voiceService from '@/services/voice';
import { useAuthStore } from '@/stores/authStore';
import type { VoiceStatusResponse } from '@/types';

export function useVoice() {
  const { loadProfile } = useAuthStore();
  const [status, setStatus] = useState<VoiceStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await voiceService.getVoiceStatus();
      setStatus(res);
      return res;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const uploadClone = useCallback(async (uri: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await voiceService.uploadVoiceClone(uri);
      setStatus({ status: res.status, voice_id: res.voice_id });
      await loadProfile();
      return res;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const deleteClone = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await voiceService.deleteVoiceClone();
      setStatus({ status: 'pending', voice_id: null });
      await loadProfile();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const startPolling = useCallback((intervalMs = 3000) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const res = await checkStatus();
      if (res.status === 'ready' || res.status === 'failed') {
        stopPolling();
        await loadProfile();
      }
    }, intervalMs);
  }, [checkStatus, loadProfile]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { status, loading, error, checkStatus, uploadClone, deleteClone, startPolling, stopPolling };
}
