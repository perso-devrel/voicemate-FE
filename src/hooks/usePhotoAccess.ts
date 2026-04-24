import { usePhotoAccessStore } from '@/stores/photoAccess';
import { DEFAULT_PHOTO_ACCESS } from '@/types/photoAccess';
import type { PhotoAccess } from '@/types/photoAccess';

// Subscribe to the photo-access registry for a given user. Returns the
// DEFAULT_PHOTO_ACCESS (fully locked) fallback when the id is missing or the
// registry has no entry yet — the safest default for pre-unlock UX.
export function usePhotoAccess(userId?: string | null): PhotoAccess {
  return usePhotoAccessStore((s) =>
    userId ? s.byUser[userId] ?? DEFAULT_PHOTO_ACCESS : DEFAULT_PHOTO_ACCESS,
  );
}
