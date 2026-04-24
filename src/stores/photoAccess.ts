import { create } from 'zustand';
import type { PhotoAccess } from '@/types/photoAccess';
import { DEFAULT_PHOTO_ACCESS } from '@/types/photoAccess';

interface IngestEntry {
  userId: string;
  access: PhotoAccess;
}

interface PhotoAccessState {
  byUser: Record<string, PhotoAccess>;
  // Batch-insert from list responses (useMatches, useDiscover). Entries with
  // falsy userId are skipped. Existing true flags are never downgraded — UX
  // must not regress because of a stale or out-of-order response.
  ingest: (entries: IngestEntry[]) => void;
  // Single-user update used by the Chat bridge. Same downgrade rule applies.
  update: (userId: string, access: PhotoAccess) => void;
  // Selector that returns DEFAULT_PHOTO_ACCESS on miss. Components should
  // prefer the usePhotoAccess hook (it subscribes), not this imperative getter.
  get: (userId: string) => PhotoAccess;
}

// Downgrade guard: each flag is carried forward as true once seen. Per-flag
// (not whole-object) so that B can flip to true while A is still false.
function merge(prev: PhotoAccess | undefined, next: PhotoAccess): PhotoAccess {
  if (!prev) return next;
  return {
    main_photo_unlocked: prev.main_photo_unlocked || next.main_photo_unlocked,
    all_photos_unlocked: prev.all_photos_unlocked || next.all_photos_unlocked,
  };
}

export const usePhotoAccessStore = create<PhotoAccessState>((set, get) => ({
  byUser: {},
  ingest: (entries) => {
    if (!entries || entries.length === 0) return;
    set((state) => {
      const next = { ...state.byUser };
      let changed = false;
      for (const { userId, access } of entries) {
        if (!userId) continue;
        const merged = merge(next[userId], access);
        const prev = next[userId];
        if (
          !prev ||
          prev.main_photo_unlocked !== merged.main_photo_unlocked ||
          prev.all_photos_unlocked !== merged.all_photos_unlocked
        ) {
          next[userId] = merged;
          changed = true;
        }
      }
      return changed ? { byUser: next } : state;
    });
  },
  update: (userId, access) => {
    if (!userId) return;
    set((state) => {
      const merged = merge(state.byUser[userId], access);
      const prev = state.byUser[userId];
      if (
        prev &&
        prev.main_photo_unlocked === merged.main_photo_unlocked &&
        prev.all_photos_unlocked === merged.all_photos_unlocked
      ) {
        return state;
      }
      return { byUser: { ...state.byUser, [userId]: merged } };
    });
  },
  get: (userId) => get().byUser[userId] ?? DEFAULT_PHOTO_ACCESS,
}));

// Non-hook handle for service/hook layers that need to ingest() outside a React
// component (e.g. inside a useMatches callback). Same store, same state.
export const photoAccessStore = {
  ingest: (entries: IngestEntry[]) => usePhotoAccessStore.getState().ingest(entries),
  update: (userId: string, access: PhotoAccess) =>
    usePhotoAccessStore.getState().update(userId, access),
  get: (userId: string) => usePhotoAccessStore.getState().get(userId),
};
