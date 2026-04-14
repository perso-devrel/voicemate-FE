import { create } from 'zustand';
import { saveTokens, clearTokens, getAccessToken, getRefreshToken } from '@/services/api';
import { loginWithGoogle } from '@/services/auth';
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
  devSkipLogin: () => Promise<void>;
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
      isAuthenticated: true,
      userId: res.user.id,
      email: res.user.email,
    });
    await get().loadProfile();
  },

  devSkipLogin: async () => {
    await saveTokens('dev-token', 'dev-refresh-token');
    set({
      isAuthenticated: true,
      userId: 'dev-user',
      email: 'dev@test.com',
      hasProfile: true,
      profile: {
        id: 'dev-user',
        display_name: 'Dev User',
        birth_date: '2000-01-01',
        gender: 'male',
        nationality: 'KR',
        language: 'ko',
        bio: 'Dev mode',
        interests: [],
        photos: [],
        voice_clone_status: 'pending',
        voice_sample_url: null,
        elevenlabs_voice_id: null,
        bio_audio_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
    });
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
      // Dev token: restore dev session
      if (token === 'dev-token') {
        await get().devSkipLogin();
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
