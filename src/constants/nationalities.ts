// Whitelisted nationalities for launch (ISO-3166-1 alpha-2). Locked at
// launch policy review — keep in sync with `haru_BE/src/schemas/profile.ts`
// `NATIONALITY_CODES`. Any change requires product + i18n + safety sign-off.
// Order here drives the picker order in setup/edit-profile/preferences.
export const SUPPORTED_NATIONALITIES = [
  { code: 'KR', labelKey: 'nationalities.KR' },
  { code: 'JP', labelKey: 'nationalities.JP' },
  { code: 'US', labelKey: 'nationalities.US' },
  { code: 'GB', labelKey: 'nationalities.GB' },
  { code: 'CA', labelKey: 'nationalities.CA' },
  { code: 'AU', labelKey: 'nationalities.AU' },
  { code: 'PH', labelKey: 'nationalities.PH' },
  { code: 'SG', labelKey: 'nationalities.SG' },
  { code: 'TH', labelKey: 'nationalities.TH' },
  { code: 'IN', labelKey: 'nationalities.IN' },
] as const;

export type NationalityCode = typeof SUPPORTED_NATIONALITIES[number]['code'];
