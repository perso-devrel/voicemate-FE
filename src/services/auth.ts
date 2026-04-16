import { api } from './api';
import type { AuthResponse } from '@/types';

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/google', { id_token: idToken });
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/login', { email, password });
}

export async function signupWithEmail(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/api/auth/signup', { email, password });
}
