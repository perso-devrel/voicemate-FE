import { api } from './api';
import type { VoiceCloneResponse, VoiceStatusResponse, VoiceDeleteResponse } from '@/types';

export async function uploadVoiceClone(uri: string): Promise<VoiceCloneResponse> {
  const formData = new FormData();
  const filename = uri.split('/').pop() ?? 'audio.wav';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'wav';
  const mimeMap: Record<string, string> = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    ogg: 'audio/ogg',
    webm: 'audio/webm',
  };
  const type = mimeMap[ext] ?? 'audio/wav';

  formData.append('audio', {
    uri,
    name: filename,
    type,
  } as unknown as Blob);

  return api.upload<VoiceCloneResponse>('/api/voice/clone', formData);
}

export async function getVoiceStatus(): Promise<VoiceStatusResponse> {
  return api.get<VoiceStatusResponse>('/api/voice/status');
}

export async function deleteVoiceClone(): Promise<VoiceDeleteResponse> {
  return api.delete<VoiceDeleteResponse>('/api/voice/clone');
}
