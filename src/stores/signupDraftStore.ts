import { create } from 'zustand';
import type { ProfileUpsertRequest, PreferenceUpdateRequest } from '@/types';

export type Gender = 'male' | 'female' | 'other';

interface SignupDraftState {
  display_name: string;
  birth_date: string;
  gender: Gender;
  nationality: string;
  language: string;
  bio: string;
  interests: string[];
  preferences: PreferenceUpdateRequest | null;
  hasStep1: boolean;

  setStep1: (data: {
    display_name: string;
    birth_date: string;
    gender: Gender;
    nationality: string;
    language: string;
  }) => void;
  setBio: (bio: string) => void;
  setInterests: (interests: string[]) => void;
  setPreferences: (preferences: PreferenceUpdateRequest | null) => void;
  reset: () => void;
  buildProfilePayload: () => ProfileUpsertRequest;
}

const initial = {
  display_name: '',
  birth_date: '',
  gender: 'male' as Gender,
  nationality: '',
  language: '',
  bio: '',
  interests: [] as string[],
  preferences: null as PreferenceUpdateRequest | null,
  hasStep1: false,
};

export const useSignupDraftStore = create<SignupDraftState>((set, get) => ({
  ...initial,
  setStep1: (data) => set({ ...data, hasStep1: true }),
  setBio: (bio) => set({ bio }),
  setInterests: (interests) => set({ interests }),
  setPreferences: (preferences) => set({ preferences }),
  reset: () => set(initial),
  buildProfilePayload: () => {
    const s = get();
    return {
      display_name: s.display_name,
      birth_date: s.birth_date,
      gender: s.gender,
      nationality: s.nationality,
      language: s.language,
      bio: s.bio.trim() ? s.bio : null,
      interests: s.interests,
    };
  },
}));
