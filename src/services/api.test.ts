import { ApiRequestError } from './api';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/devData', () => ({
  getDevResponse: jest.fn(),
}));

describe('ApiRequestError', () => {
  it('is an Error subclass', () => {
    const err = new ApiRequestError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiRequestError);
  });

  it('exposes status and errorMessage fields verbatim', () => {
    const err = new ApiRequestError(401, 'Unauthorized');
    expect(err.status).toBe(401);
    expect(err.errorMessage).toBe('Unauthorized');
  });

  it('uses errorMessage as the Error.message so toString is consistent', () => {
    const err = new ApiRequestError(500, 'Server exploded');
    expect(err.message).toBe('Server exploded');
    expect(String(err)).toContain('Server exploded');
  });

  it('sets the name so type guards and log aggregators can filter it', () => {
    const err = new ApiRequestError(0, 'Network timeout');
    expect(err.name).toBe('ApiRequestError');
  });

  it('captures a stack trace', () => {
    const err = new ApiRequestError(500, 'boom');
    expect(typeof err.stack).toBe('string');
    expect(err.stack).toContain('ApiRequestError');
  });

  it('survives JSON.stringify round-trip via explicit field copy', () => {
    // Error subclasses don't serialise their own fields by default; consumers
    // must pick the fields manually. This test documents the expected shape.
    const err = new ApiRequestError(422, 'Validation failed');
    const serialisable = {
      name: err.name,
      status: err.status,
      errorMessage: err.errorMessage,
    };
    expect(JSON.parse(JSON.stringify(serialisable))).toEqual({
      name: 'ApiRequestError',
      status: 422,
      errorMessage: 'Validation failed',
    });
  });
});
