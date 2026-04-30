import { create } from 'zustand';
import type { LanguageProficiency, ProfileUpsertRequest, PreferenceUpdateRequest } from '@/types';

export type Gender = 'male' | 'female' | 'other';

interface SignupDraftState {
  display_name: string;
  birth_date: string;
  gender: Gender;
  nationality: string;
  // Multi-language proficiency. languages[0].code is the primary language
  // for the BE translation/TTS pipeline (derived server-side).
  languages: LanguageProficiency[];
  bio: string;
  interests: string[];
  preferences: PreferenceUpdateRequest | null;
  // Local URIs for photos picked in step5, uploaded after profile is created.
  photoUris: string[];
  hasStep1: boolean;

  setStep1: (data: {
    display_name: string;
    birth_date: string;
    gender: Gender;
    nationality: string;
    languages: LanguageProficiency[];
  }) => void;
  setBio: (bio: string) => void;
  setInterests: (interests: string[]) => void;
  setPreferences: (preferences: PreferenceUpdateRequest | null) => void;
  setPhotoUris: (uris: string[]) => void;
  reset: () => void;
  buildProfilePayload: () => ProfileUpsertRequest;
}

const initial = {
  display_name: '',
  birth_date: '',
  gender: 'male' as Gender,
  nationality: '',
  languages: [] as LanguageProficiency[],
  bio: '',
  interests: [] as string[],
  preferences: null as PreferenceUpdateRequest | null,
  photoUris: [] as string[],
  hasStep1: false,
};

export const useSignupDraftStore = create<SignupDraftState>((set, get) => ({
  ...initial,
  setStep1: (data) => set({ ...data, hasStep1: true }),
  setBio: (bio) => set({ bio }),
  setInterests: (interests) => set({ interests }),
  setPreferences: (preferences) => set({ preferences }),
  setPhotoUris: (photoUris) => set({ photoUris }),
  reset: () => set(initial),
  buildProfilePayload: () => {
    const s = get();
    return {
      display_name: s.display_name,
      birth_date: s.birth_date,
      gender: s.gender,
      nationality: s.nationality,
      languages: s.languages,
      voice_intro: s.bio.trim() ? s.bio : null,
      interests: s.interests,
    };
  },
}));
