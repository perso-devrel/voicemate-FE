import {
  DEFAULT_BACKOFF_BASE_MS,
  DEFAULT_BACKOFF_CAP_MS,
  computeBackoffDelay,
} from './backoff';

describe('computeBackoffDelay', () => {
  it('returns the base delay on the first retry', () => {
    expect(computeBackoffDelay(0)).toBe(DEFAULT_BACKOFF_BASE_MS);
  });

  it('doubles on every attempt', () => {
    expect(computeBackoffDelay(1)).toBe(2_000);
    expect(computeBackoffDelay(2)).toBe(4_000);
    expect(computeBackoffDelay(3)).toBe(8_000);
  });

  it('caps at the maximum window', () => {
    expect(computeBackoffDelay(10)).toBe(DEFAULT_BACKOFF_CAP_MS);
    expect(computeBackoffDelay(20)).toBe(DEFAULT_BACKOFF_CAP_MS);
  });

  it('falls back to base for invalid attempt numbers', () => {
    expect(computeBackoffDelay(-1)).toBe(DEFAULT_BACKOFF_BASE_MS);
    expect(computeBackoffDelay(NaN)).toBe(DEFAULT_BACKOFF_BASE_MS);
  });

  it('accepts custom base/cap for tests or short-lived flows', () => {
    expect(computeBackoffDelay(0, 100, 500)).toBe(100);
    expect(computeBackoffDelay(5, 100, 500)).toBe(500);
  });
});
