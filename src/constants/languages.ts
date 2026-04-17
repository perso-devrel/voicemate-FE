export const SUPPORTED_LANGUAGES = [
  { code: 'ko', labelKey: 'languages.ko' },
  { code: 'en', labelKey: 'languages.en' },
  { code: 'ja', labelKey: 'languages.ja' },
  { code: 'zh', labelKey: 'languages.zh' },
  { code: 'es', labelKey: 'languages.es' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly LanguageCode[];

export const isLanguageCode = (value: string): value is LanguageCode =>
  (LANGUAGE_CODES as readonly string[]).includes(value);
