export const SUPPORTED_NATIONALITIES = [
  { code: 'KR', labelKey: 'nationalities.KR' },
  { code: 'US', labelKey: 'nationalities.US' },
  { code: 'JP', labelKey: 'nationalities.JP' },
  { code: 'CN', labelKey: 'nationalities.CN' },
  { code: 'ES', labelKey: 'nationalities.ES' },
  { code: 'GB', labelKey: 'nationalities.GB' },
  { code: 'CA', labelKey: 'nationalities.CA' },
  { code: 'AU', labelKey: 'nationalities.AU' },
  { code: 'FR', labelKey: 'nationalities.FR' },
  { code: 'DE', labelKey: 'nationalities.DE' },
  { code: 'IT', labelKey: 'nationalities.IT' },
  { code: 'VN', labelKey: 'nationalities.VN' },
  { code: 'TH', labelKey: 'nationalities.TH' },
  { code: 'PH', labelKey: 'nationalities.PH' },
  { code: 'ID', labelKey: 'nationalities.ID' },
  { code: 'IN', labelKey: 'nationalities.IN' },
  { code: 'BR', labelKey: 'nationalities.BR' },
  { code: 'MX', labelKey: 'nationalities.MX' },
  { code: 'RU', labelKey: 'nationalities.RU' },
  { code: 'TR', labelKey: 'nationalities.TR' },
] as const;

export type NationalityCode = typeof SUPPORTED_NATIONALITIES[number]['code'];
