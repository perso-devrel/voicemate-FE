import { isButtonDisabled } from './Button';

jest.mock('react-native', () => ({
  Pressable: () => null,
  Text: () => null,
  ActivityIndicator: () => null,
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

describe('isButtonDisabled', () => {
  it('returns false when neither disabled nor loading is set', () => {
    expect(isButtonDisabled()).toBe(false);
    expect(isButtonDisabled(false, false)).toBe(false);
  });

  it('returns true when disabled is true', () => {
    expect(isButtonDisabled(true)).toBe(true);
    expect(isButtonDisabled(true, false)).toBe(true);
  });

  it('returns true when loading is true', () => {
    expect(isButtonDisabled(false, true)).toBe(true);
    expect(isButtonDisabled(undefined, true)).toBe(true);
  });

  it('reads only its own arguments (no cross-instance state)', () => {
    // Regression: this matters because the login screen renders two
    // independent Button instances (email + Google). A loading sibling
    // must never dim the other button.
    const emailLoading = isButtonDisabled(false, true);
    const googleAvailable = isButtonDisabled(false, false);
    expect(emailLoading).toBe(true);
    expect(googleAvailable).toBe(false);
  });
});
