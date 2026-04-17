import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/config';
import { getDevResponse } from '@/services/devData';
import type { TokenRefreshResponse } from '@/types';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public errorMessage: string,
  ) {
    super(errorMessage);
    this.name = 'ApiRequestError';
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new ApiRequestError(0, 'Network timeout. Please check your connection.');
    }
    throw new ApiRequestError(0, 'Network error. Please check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

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
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/refresh`, {
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
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    const token = await getValidToken();

    // Dev mode: return dummy data for UI testing
    if (token === 'dev-token') {
      return getDevResponse(path, options.method ?? 'GET', options.body) as T;
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

    const res = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      { ...options, headers },
      timeoutMs,
    );

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
        return this.request<T>(path, options, false, timeoutMs);
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
    return this.request<T>(
      path,
      { method: 'POST', body: formData },
      true,
      UPLOAD_TIMEOUT_MS,
    );
  }
}

export const api = new ApiClient();
