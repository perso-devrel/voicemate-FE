import { ApiRequestError } from '@/services/api';

/**
 * Race an upload promise against a hard timeout so the UI never stays
 * stuck on a spinner when the device loses connectivity mid-transfer.
 *
 * `expo-file-system/legacy`'s `uploadAsync` does not accept an
 * AbortSignal, so we cannot actually cancel the background transfer.
 * The surrounding call site must treat a thrown ApiRequestError(0)
 * as "upload failed" and ask the user to retry; the stray transfer
 * becomes a no-op.
 */
export const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadWithTimeout<T>(
  task: Promise<T>,
  timeoutMs: number = DEFAULT_UPLOAD_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ApiRequestError(0, 'Upload timeout. Please try again.'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
