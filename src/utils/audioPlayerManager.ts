/**
 * Holds a reference to a single active audio player so chat screens
 * (and anything else that plays one clip at a time) never stack native
 * players on top of each other. Extracted out of the chat screen so the
 * leak-prevention invariants can be tested without the React tree.
 */
export interface AudioPlayerLike {
  remove(): void;
  play(): void;
  addListener(
    event: 'playbackStatusUpdate',
    listener: (status: { playing: boolean; currentTime: number; duration: number }) => void,
  ): { remove: () => void };
}

export type AudioPlayerFactory = (url: string) => AudioPlayerLike;

export interface AudioPlayerManager {
  play(url: string): AudioPlayerLike;
  release(): void;
  current(): AudioPlayerLike | null;
}

export function createAudioPlayerManager(factory: AudioPlayerFactory): AudioPlayerManager {
  let active: AudioPlayerLike | null = null;

  const safeRemove = (player: AudioPlayerLike | null) => {
    if (!player) return;
    try {
      player.remove();
    } catch {
      // remove() can throw if the player was already released by a
      // platform-level cleanup; there is nothing left to do.
    }
  };

  const release = () => {
    const prev = active;
    active = null;
    safeRemove(prev);
  };

  const play = (url: string) => {
    release();
    const player = factory(url);
    active = player;

    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.playing && status.currentTime >= status.duration) {
        try {
          sub.remove();
        } catch {
          /* listener may already be detached */
        }
        if (active === player) {
          release();
        } else {
          safeRemove(player);
        }
      }
    });

    player.play();
    return player;
  };

  return {
    play,
    release,
    current: () => active,
  };
}
