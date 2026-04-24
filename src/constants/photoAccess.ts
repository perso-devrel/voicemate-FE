import type { PhotoAccess } from '@/types/photoAccess';

// Round-trip thresholds that gate photo reveal stages. These must stay in sync
// with BE `src/constants/chat.ts` and the `005_match_photo_access.sql` migration
// constants. Single source of truth for FE.
export const UNLOCK_MAIN_PHOTO_AT = 5;
// TODO: 기획 확정 필요 — 임시로 iter1의 값 10을 승계.
export const UNLOCK_ALL_PHOTOS_AT = 10;

// Client-side bridge: derive PhotoAccess from a chat round-trip count. Used by
// the Chat screen while BE does not yet ship `photo_access`. Remove this helper
// once BE is the single source of truth (see [matchId].tsx bridge block).
export function fromRoundTrips(roundTrips: number): PhotoAccess {
  return {
    main_photo_unlocked: roundTrips >= UNLOCK_MAIN_PHOTO_AT,
    all_photos_unlocked: roundTrips >= UNLOCK_ALL_PHOTOS_AT,
  };
}
