import { MIN_AGE, MAX_AGE, validateAgeRange } from './preferences';

describe('validateAgeRange', () => {
  it('accepts a typical range', () => {
    expect(validateAgeRange('25', '40')).toEqual({ ok: true, min: 25, max: 40 });
  });

  it('allows equal min and max (single-age match)', () => {
    expect(validateAgeRange('30', '30')).toEqual({ ok: true, min: 30, max: 30 });
  });

  it('rejects min > max', () => {
    expect(validateAgeRange('40', '25')).toEqual({
      ok: false,
      min: 40,
      max: 25,
      error: 'min-greater-than-max',
    });
  });

  it('rejects below MIN_AGE', () => {
    const r = validateAgeRange('17', '30');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('out-of-bounds');
  });

  it('rejects above MAX_AGE', () => {
    const r = validateAgeRange('18', '120');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('out-of-bounds');
  });

  it('treats non-numeric input as the default bound so the UI still submits', () => {
    // Contract: the preferences screen does not block empty input; the
    // validator produces usable numbers so the user never sees NaN.
    expect(validateAgeRange('', '').ok).toBe(true);
    expect(validateAgeRange('', '').min).toBe(MIN_AGE);
    expect(validateAgeRange('', '').max).toBe(MAX_AGE);
  });
});
