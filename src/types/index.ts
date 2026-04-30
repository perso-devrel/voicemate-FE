import type { PhotoAccess } from './photoAccess';

// Re-exported for convenience so call sites can `import { PhotoAccess } from '@/types'`.
export type { PhotoAccess } from './photoAccess';
export { DEFAULT_PHOTO_ACCESS } from './photoAccess';

// === Auth ===
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
}

// === Language proficiency ===
// 1 = beginner, 2 = intermediate (daily conversation),
// 3 = native (fluent / unrestricted conversation).
export type LanguageLevel = 1 | 2 | 3;

export interface LanguageProficiency {
  code: string;
  level: LanguageLevel;
}

// === Profile ===
export interface Profile {
  id: string;
  display_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  // Primary language code, derived server-side from languages[0].code.
  language: string;
  // Multi-language proficiency. Optional during BE migration window —
  // pre-006 rows are absent until backfill runs.
  languages?: LanguageProficiency[];
  voice_intro: string | null;
  interests: string[];
  photos: string[];
  elevenlabs_voice_id: string | null;
  voice_sample_url: string | null;
  voice_clone_status: 'pending' | 'processing' | 'ready' | 'failed';
  voice_intro_audio_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpsertRequest {
  display_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  // Either languages (preferred) or legacy language must be set. The route
  // derives `language` = languages[0].code when languages is provided.
  language?: string;
  languages?: LanguageProficiency[];
  voice_intro?: string | null;
  interests?: string[];
}

export interface PhotoUploadResponse {
  url: string;
  photos: string[];
}

export interface PhotoDeleteResponse {
  photos: string[];
}

// === Voice ===
export interface VoiceCloneResponse {
  voice_id: string;
  status: 'ready';
}

export interface VoiceStatusResponse {
  status: 'pending' | 'processing' | 'ready' | 'failed';
  voice_id: string | null;
}

export interface VoiceDeleteResponse {
  status: 'deleted';
}

// === Discover / Swipe ===
export interface DiscoverCandidate {
  id: string;
  display_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  language: string;
  voice_intro: string | null;
  voice_intro_audio_url: string | null;
  interests: string[];
  // Policy: BE restricts to `[photos[0]]`. FE always forceBlurs regardless.
  photos: string[];
  // Optional until BE ships iter2. Always { false, false } by policy.
  photo_access?: PhotoAccess;
}

export interface SwipeRequest {
  swiped_id: string;
  direction: 'like' | 'pass';
}

export interface SwipeResponse {
  direction: 'like' | 'pass';
  match: Match | null;
}

export interface DiscoverQuota {
  count: number;
  limit: number;
  remaining: number;
  date: string; // YYYY-MM-DD (사용자 로컬 자정 기준 BE 가 계산)
}

// === Match ===
export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  unmatched_at: string | null;
  unmatched_by: string | null;
  created_at: string;
}

export interface MatchPartner {
  id: string;
  display_name: string;
  photos: string[];
  nationality: string;
  language: string;
}

export interface PartnerDetail {
  birth_date: string;
  interests: string[];
  voice_intro_audio_url: string | null;
}

export interface MatchListItem {
  match_id: string;
  created_at: string;
  partner: MatchPartner | null;
  last_message: {
    id: string;
    original_text: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count: number;
  // Per-match, viewer-relative photo reveal flags aggregated by BE.
  // Optional during BE migration window (iter2); will become required once
  // `/api/matches` ships the field unconditionally. Undefined → treat as
  // DEFAULT_PHOTO_ACCESS (fully locked).
  photo_access?: PhotoAccess;
}

// === Message ===
export type Emotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'excited'
  | 'whispering'
  | 'laughing';

export type AudioStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  original_text: string;
  original_language: string;
  translated_text: string | null;
  translated_language: string | null;
  audio_url: string | null;
  audio_status: AudioStatus;
  // BE normalises 'neutral' → null for storage; both shapes are observed.
  emotion: Emotion | null;
  read_at: string | null;
  created_at: string;
}

export interface SendMessageRequest {
  text: string;
  emotion?: Emotion;
}

export interface ReadResponse {
  read_count: number;
}

export interface RetryResponse {
  status: 'processing';
}

// === Block ===
export interface BlockRequest {
  blocked_id: string;
}

export interface BlockListItem {
  blocked_id: string;
  created_at: string;
  profile: {
    id: string;
    display_name: string;
    photos: string[];
  };
}

// === Report ===
export type ReportReason = 'spam' | 'inappropriate' | 'fake_profile' | 'harassment' | 'other';

export interface ReportRequest {
  reported_id: string;
  reason: ReportReason;
  description?: string;
}

// === Preference ===
export interface UserPreference {
  user_id: string;
  min_age: number;
  max_age: number;
  preferred_genders: ('male' | 'female' | 'other')[];
  // Codes + minimum required level. Empty = no language preference.
  preferred_languages_detail: LanguageProficiency[];
  // ISO-3166-1 alpha-2 country codes. Empty = no nationality preference.
  preferred_nationalities: string[];
  updated_at?: string;
}

export interface PreferenceUpdateRequest {
  min_age?: number;
  max_age?: number;
  preferred_genders?: ('male' | 'female' | 'other')[];
  preferred_languages_detail?: LanguageProficiency[];
  preferred_nationalities?: string[];
}

// === Error ===
export interface ApiError {
  error: string;
}
