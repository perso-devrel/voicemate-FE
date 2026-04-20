import { ApiRequestError } from '@/services/api';
import { uploadWithTimeout } from './upload';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('uploadWithTimeout', () => {
  it('resolves with the task value when it completes before the timeout', async () => {
    const task = Promise.resolve({ ok: true });
    await expect(uploadWithTimeout(task, 1_000)).resolves.toEqual({ ok: true });
  });

  it('rejects with ApiRequestError(0, /timeout/i) when the task outlives the window', async () => {
    const neverSettles = new Promise<never>(() => {
      /* never resolves */
    });
    await expect(uploadWithTimeout(neverSettles, 10)).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 0,
      errorMessage: expect.stringMatching(/timeout/i),
    });
  });

  it('propagates the original rejection when the task fails first', async () => {
    const original = new Error('network down');
    const task = Promise.reject(original);
    await expect(uploadWithTimeout(task, 5_000)).rejects.toBe(original);
  });

  it('throws an ApiRequestError that downstream catch blocks can narrow', async () => {
    const neverSettles = new Promise<never>(() => {
      /* never resolves */
    });
    try {
      await uploadWithTimeout(neverSettles, 5);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as ApiRequestError).status).toBe(0);
    }
  });
});
