import { api } from './api';
import type { AuthResponse } from '@/types';

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/google', { id_token: idToken });
}
