import { create } from 'zustand';
import { saveTokens, clearTokens, getAccessToken, getRefreshToken } from '@/services/api';
import { loginWithGoogle, loginWithEmail as loginEmailApi, signupWithEmail as signupEmailApi } from '@/services/auth';
import { getMyProfile } from '@/services/profile';
import type { Profile } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  hasProfile: boolean;

  login: (idToken: string) => Promise<void>;
  emailLogin: (email: string, password: string) => Promise<void>;
  emailSignup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  tryAutoLogin: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  email: null,
  profile: null,
  hasProfile: false,

  login: async (idToken: string) => {
    const res = await loginWithGoogle(idToken);
    await saveTokens(res.access_token, res.refresh_token);
    set({
      userId: res.user.id,
      email: res.user.email,
    });
    await get().loadProfile();
    set({ isAuthenticated: true });
  },

  emailLogin: async (email: string, password: string) => {
    const res = await loginEmailApi(email, password);
    await saveTokens(res.access_token, res.refresh_token);
    set({
      userId: res.user.id,
      email: res.user.email,
    });
    await get().loadProfile();
    set({ isAuthenticated: true });
  },

  emailSignup: async (email: string, password: string) => {
    const res = await signupEmailApi(email, password);
    if (!res.access_token || !res.refresh_token) {
      throw new Error('Email confirmation required. Please check your inbox.');
    }
    await saveTokens(res.access_token, res.refresh_token);
    set({
      userId: res.user.id,
      email: res.user.email,
    });
    await get().loadProfile();
    set({ isAuthenticated: true });
  },

  logout: async () => {
    await clearTokens();
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
      profile: null,
      hasProfile: false,
    });
  },

  tryAutoLogin: async () => {
    if (get().isAuthenticated) return;
    set({ isLoading: true });
    try {
      const token = await getAccessToken();
      const refreshToken = await getRefreshToken();
      if (!token && !refreshToken) {
        set({ isLoading: false });
        return;
      }
      // Validate token by fetching profile
      await get().loadProfile();
      set({ isAuthenticated: true });
    } catch {
      await clearTokens();
      set({ isAuthenticated: false, profile: null, hasProfile: false });
    } finally {
      set({ isLoading: false });
    }
  },

  loadProfile: async () => {
    try {
      const profile = await getMyProfile();
      set({ profile, hasProfile: true, userId: profile.id });
    } catch {
      set({ profile: null, hasProfile: false });
    }
  },

  setProfile: (profile: Profile) => {
    set({ profile, hasProfile: true });
  },
}));
