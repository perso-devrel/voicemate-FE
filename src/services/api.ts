import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';
import type { TokenRefreshResponse } from '@/types';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data: TokenRefreshResponse = await res.json();
    await saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    await clearTokens();
    return null;
  }
}

async function getValidToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  return getAccessToken();
}

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const token = await getValidToken();

    // Dev mode: skip real API calls, return empty data
    if (token === 'dev-token') {
      return [] as T;
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser/RN sets boundary automatically)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && retry) {
      const currentToken = await getAccessToken();
      // Dev mode: don't attempt refresh/logout with fake tokens
      if (currentToken === 'dev-token') {
        throw new Error('Dev mode: API not available');
      }

      isRefreshing = true;
      refreshPromise = refreshAccessToken();
      const newToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (newToken) {
        return this.request<T>(path, options, false);
      }

      // Refresh failed - trigger logout via store import to avoid circular dep
      const { useAuthStore } = require('@/stores/authStore');
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiRequestError(res.status, error.error ?? 'Unknown error');
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  upload<T>(path: string, formData: FormData) {
    return this.request<T>(path, {
      method: 'POST',
      body: formData,
    });
  }
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public errorMessage: string,
  ) {
    super(errorMessage);
    this.name = 'ApiRequestError';
  }
}

export const api = new ApiClient();
