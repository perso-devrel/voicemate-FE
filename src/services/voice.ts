import * as FileSystem from 'expo-file-system/legacy';
import { api, getAccessToken } from './api';
import { API_BASE_URL } from '@/constants/config';
import type { VoiceCloneResponse, VoiceStatusResponse, VoiceDeleteResponse } from '@/types';

const AUDIO_MIME_MAP: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  aac: 'audio/mp4',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
};

export async function uploadVoiceClone(uri: string): Promise<VoiceCloneResponse> {
  const filename = uri.split('/').pop() ?? 'audio.m4a';
  const ext = (filename.split('.').pop() ?? 'm4a').toLowerCase();
  const mimeType = AUDIO_MIME_MAP[ext] ?? 'audio/mp4';

  const token = await getAccessToken();
  const result = await FileSystem.uploadAsync(
    `${API_BASE_URL}/api/voice/clone`,
    uri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'audio',
      mimeType,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );

  if (result.status < 200 || result.status >= 300) {
    let message = 'Upload failed';
    try {
      message = JSON.parse(result.body).error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(`${message} (HTTP ${result.status})`);
  }

  return JSON.parse(result.body) as VoiceCloneResponse;
}

export async function getVoiceStatus(): Promise<VoiceStatusResponse> {
  return api.get<VoiceStatusResponse>('/api/voice/status');
}

export async function deleteVoiceClone(): Promise<VoiceDeleteResponse> {
  return api.delete<VoiceDeleteResponse>('/api/voice/clone');
}
