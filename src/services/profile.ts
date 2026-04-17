import * as FileSystem from 'expo-file-system/legacy';
import { api, ApiRequestError, getAccessToken } from './api';
import { API_BASE_URL } from '@/constants/config';
import { uploadWithTimeout } from '@/utils/upload';
import type {
  Profile,
  ProfileUpsertRequest,
  PhotoUploadResponse,
  PhotoDeleteResponse,
} from '@/types';

export async function getMyProfile(): Promise<Profile> {
  return api.get<Profile>('/api/profile/me');
}

export async function upsertProfile(data: ProfileUpsertRequest): Promise<Profile> {
  return api.put<Profile>('/api/profile/me', data);
}

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function uploadPhoto(uri: string): Promise<PhotoUploadResponse> {
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext = (/\.(\w+)$/.exec(filename)?.[1] ?? 'jpeg').toLowerCase();
  const mimeType = MIME_MAP[ext] ?? 'image/jpeg';

  const token = await getAccessToken();
  const result = await uploadWithTimeout(
    FileSystem.uploadAsync(`${API_BASE_URL}/api/profile/photos`, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'photo',
      mimeType,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  );

  if (result.status < 200 || result.status >= 300) {
    let message = 'Upload failed';
    try {
      message = JSON.parse(result.body).error ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiRequestError(result.status, message);
  }

  return JSON.parse(result.body) as PhotoUploadResponse;
}

export async function deletePhoto(index: number): Promise<PhotoDeleteResponse> {
  return api.delete<PhotoDeleteResponse>(`/api/profile/photos/${index}`);
}
