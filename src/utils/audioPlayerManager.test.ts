import {
  AudioPlayerLike,
  createAudioPlayerManager,
} from './audioPlayerManager';

type StatusListener = (s: { playing: boolean; currentTime: number; duration: number }) => void;

function makeFakePlayer() {
  const listeners: StatusListener[] = [];
  const api = {
    remove: jest.fn(),
    play: jest.fn(),
    addListener: jest.fn((event: string, listener: StatusListener) => {
      if (event !== 'playbackStatusUpdate') throw new Error(`unexpected ${event}`);
      listeners.push(listener);
      return { remove: jest.fn(() => void listeners.splice(listeners.indexOf(listener), 1)) };
    }),
  } satisfies AudioPlayerLike;

  return {
    player: api,
    emit(status: { playing: boolean; currentTime: number; duration: number }) {
      for (const l of [...listeners]) l(status);
    },
  };
}

describe('createAudioPlayerManager', () => {
  it('creates a player when play is called', () => {
    const spy = jest.fn(() => makeFakePlayer().player);
    const mgr = createAudioPlayerManager(spy);

    mgr.play('file://a.mp3');
    expect(spy).toHaveBeenCalledWith('file://a.mp3');
    expect(mgr.current()).not.toBeNull();
    expect(mgr.current()!.play).toHaveBeenCalledTimes(1);
  });

  it('releases the previous player before starting a new one', () => {
    const fake1 = makeFakePlayer();
    const fake2 = makeFakePlayer();
    const spy = jest.fn()
      .mockReturnValueOnce(fake1.player)
      .mockReturnValueOnce(fake2.player);
    const mgr = createAudioPlayerManager(spy);

    mgr.play('a');
    mgr.play('b');

    expect(fake1.player.remove).toHaveBeenCalledTimes(1);
    expect(fake2.player.remove).not.toHaveBeenCalled();
    expect(mgr.current()).toBe(fake2.player);
  });

  it('auto-releases when the playback reaches the end of duration', () => {
    const fake = makeFakePlayer();
    const mgr = createAudioPlayerManager(() => fake.player);

    mgr.play('a');
    fake.emit({ playing: false, currentTime: 10, duration: 10 });

    expect(fake.player.remove).toHaveBeenCalledTimes(1);
    expect(mgr.current()).toBeNull();
  });

  it('does not remove while playback is still in progress', () => {
    const fake = makeFakePlayer();
    const mgr = createAudioPlayerManager(() => fake.player);

    mgr.play('a');
    fake.emit({ playing: true, currentTime: 3, duration: 10 });

    expect(fake.player.remove).not.toHaveBeenCalled();
    expect(mgr.current()).toBe(fake.player);
  });

  it('release() detaches the active player', () => {
    const fake = makeFakePlayer();
    const mgr = createAudioPlayerManager(() => fake.player);

    mgr.play('a');
    mgr.release();

    expect(fake.player.remove).toHaveBeenCalledTimes(1);
    expect(mgr.current()).toBeNull();
  });

  it('swallows exceptions from player.remove() so the manager stays usable', () => {
    const player = {
      remove: jest.fn(() => { throw new Error('native already released'); }),
      play: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    const mgr = createAudioPlayerManager(() => player);

    mgr.play('a');
    expect(() => mgr.release()).not.toThrow();
    expect(mgr.current()).toBeNull();
  });
});
