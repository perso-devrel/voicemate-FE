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

// === Profile ===
export interface Profile {
  id: string;
  display_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  language: string;
  bio: string | null;
  interests: string[];
  photos: string[];
  elevenlabs_voice_id: string | null;
  voice_sample_url: string | null;
  voice_clone_status: 'pending' | 'processing' | 'ready' | 'failed';
  bio_audio_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpsertRequest {
  display_name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  language: string;
  bio?: string | null;
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
  bio: string | null;
  interests: string[];
  photos: string[];
}

export interface SwipeRequest {
  swiped_id: string;
  direction: 'like' | 'pass';
}

export interface SwipeResponse {
  direction: 'like' | 'pass';
  match: Match | null;
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
}

// === Message ===
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  original_text: string;
  original_language: string;
  translated_text: string | null;
  translated_language: string | null;
  audio_url: string | null;
  audio_status: 'pending' | 'processing' | 'ready' | 'failed';
  read_at: string | null;
  created_at: string;
}

export interface SendMessageRequest {
  text: string;
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
  preferred_languages: string[];
  updated_at?: string;
}

export interface PreferenceUpdateRequest {
  min_age?: number;
  max_age?: number;
  preferred_genders?: ('male' | 'female' | 'other')[];
  preferred_languages?: string[];
}

// === Error ===
export interface ApiError {
  error: string;
}
