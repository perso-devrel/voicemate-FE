export const SUPPORTED_LANGUAGES = [
  { code: 'ko', labelKey: 'languages.ko' },
  { code: 'en', labelKey: 'languages.en' },
  { code: 'ja', labelKey: 'languages.ja' },
  { code: 'zh', labelKey: 'languages.zh' },
  { code: 'es', labelKey: 'languages.es' },
  { code: 'fr', labelKey: 'languages.fr' },
  { code: 'de', labelKey: 'languages.de' },
  { code: 'it', labelKey: 'languages.it' },
  { code: 'pt', labelKey: 'languages.pt' },
  { code: 'ru', labelKey: 'languages.ru' },
  { code: 'tr', labelKey: 'languages.tr' },
  { code: 'vi', labelKey: 'languages.vi' },
  { code: 'th', labelKey: 'languages.th' },
  { code: 'tl', labelKey: 'languages.tl' },
  { code: 'id', labelKey: 'languages.id' },
  { code: 'hi', labelKey: 'languages.hi' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly LanguageCode[];

export const isLanguageCode = (value: string): value is LanguageCode =>
  (LANGUAGE_CODES as readonly string[]).includes(value);
