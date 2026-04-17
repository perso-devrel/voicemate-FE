/**
 * Compute an exponential-backoff delay for a retryable operation.
 *
 * `attempt` is 0-based (first retry = 0). The returned value is capped
 * at `capMs` so a long-lived flaky channel never sleeps longer than a
 * user would tolerate.
 */
export const DEFAULT_BACKOFF_BASE_MS = 1_000;
export const DEFAULT_BACKOFF_CAP_MS = 30_000;

export function computeBackoffDelay(
  attempt: number,
  baseMs: number = DEFAULT_BACKOFF_BASE_MS,
  capMs: number = DEFAULT_BACKOFF_CAP_MS,
): number {
  if (attempt < 0 || !Number.isFinite(attempt)) return baseMs;
  const raw = baseMs * 2 ** attempt;
  return Math.min(raw, capMs);
}
