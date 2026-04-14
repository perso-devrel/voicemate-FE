import { api } from './api';
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

export async function uploadPhoto(uri: string): Promise<PhotoUploadResponse> {
  const formData = new FormData();
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('photo', {
    uri,
    name: filename,
    type,
  } as unknown as Blob);

  return api.upload<PhotoUploadResponse>('/api/profile/photos', formData);
}

export async function deletePhoto(index: number): Promise<PhotoDeleteResponse> {
  return api.delete<PhotoDeleteResponse>(`/api/profile/photos/${index}`);
}
