import { ApiRequestError } from '@/services/api';

/**
 * Extract a display-safe error message from any thrown value.
 *
 * Order of preference (from most specific to least):
 *   1. `ApiRequestError.errorMessage` — already vetted by the API layer
 *   2. `Error.message` — catches framework / library errors
 *   3. string thrown directly (legacy code paths)
 *   4. `fallback` literal provided by the caller
 *
 * The caller passes a `fallback` that is usually an i18n key resolved
 * via `t('common.error')`, so the function never returns an empty
 * string even for unknown throwable shapes.
 */
export function describeError(e: unknown, fallback = 'Unexpected error'): string {
  if (e instanceof ApiRequestError) return e.errorMessage || fallback;
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'string' && e.length > 0) return e;
  return fallback;
}

/**
 * Narrow helper for `catch` blocks that only care about status codes.
 * Returns 0 for non-ApiRequestError values so callers can early-out.
 */
export function errorStatus(e: unknown): number {
  return e instanceof ApiRequestError ? e.status : 0;
}
