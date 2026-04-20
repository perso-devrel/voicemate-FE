import { ApiRequestError, api } from './api';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('ApiClient fetch wrapper', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('maps AbortError from fetchWithTimeout to ApiRequestError with timeout message', async () => {
    const abortErr: Error & { name: string } = Object.assign(
      new Error('Aborted'),
      { name: 'AbortError' },
    );
    global.fetch = jest.fn().mockRejectedValue(abortErr) as unknown as typeof fetch;

    await expect(api.get('/anything')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 0,
      errorMessage: expect.stringMatching(/timeout/i),
    });
  });

  it('maps generic network errors to ApiRequestError with network message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;

    await expect(api.post('/anything', { ok: true })).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 0,
      errorMessage: expect.stringMatching(/network/i),
    });
  });

  it('passes an AbortSignal to fetch so the request can be cancelled on timeout', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await api.get('/anything');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBeDefined();
    expect(init.signal.aborted).toBe(false);
  });

  it('surfaces server error payload as ApiRequestError with the status code preserved', async () => {
    const response = new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

    try {
      await api.get('/missing');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as ApiRequestError).status).toBe(404);
      expect((err as ApiRequestError).errorMessage).toBe('Not found');
    }
  });
});
