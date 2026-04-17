import { ApiRequestError } from '@/services/api';
import { describeError, errorStatus } from './errors';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/services/devData', () => ({
  getDevResponse: jest.fn(),
}));

describe('describeError', () => {
  it('prefers ApiRequestError.errorMessage', () => {
    const e = new ApiRequestError(400, 'Email already in use');
    expect(describeError(e)).toBe('Email already in use');
    expect(errorStatus(e)).toBe(400);
  });

  it('falls back to fallback when ApiRequestError has no message', () => {
    const e = new ApiRequestError(500, '');
    expect(describeError(e, 'fallback')).toBe('fallback');
  });

  it('reads Error.message for generic runtime errors', () => {
    expect(describeError(new Error('oops'))).toBe('oops');
  });

  it('returns a raw thrown string directly', () => {
    expect(describeError('plain string')).toBe('plain string');
  });

  it('uses the fallback for unknown shapes (undefined, number, object)', () => {
    expect(describeError(undefined, 'F1')).toBe('F1');
    expect(describeError(42, 'F2')).toBe('F2');
    expect(describeError({ any: 'shape' }, 'F3')).toBe('F3');
  });

  it('errorStatus returns 0 for non-API errors', () => {
    expect(errorStatus(new Error('plain'))).toBe(0);
    expect(errorStatus(undefined)).toBe(0);
  });
});
