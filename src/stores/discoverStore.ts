import { create } from 'zustand';

// Lightweight signal bus the discover screen listens to. Other screens (e.g.
// preferences save) call `bumpReload()` to ask discover to drop its cached
// candidates and re-fetch from the BE the next time the user is on the tab.
//
// We intentionally do NOT trigger any network calls here — the discover
// screen owns its own loading state and dailyCount fetch. This store is just
// a "you might be stale" tap on the shoulder.
interface DiscoverState {
  reloadVersion: number;
  bumpReload: () => void;
}

export const useDiscoverStore = create<DiscoverState>((set) => ({
  reloadVersion: 0,
  bumpReload: () =>
    set((s) => ({ reloadVersion: s.reloadVersion + 1 })),
}));
