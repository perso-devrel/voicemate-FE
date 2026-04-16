import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ko from './locales/ko';
import en from './locales/en';

const resources = {
  ko: { translation: ko },
  en: { translation: en },
} as const;

export type SupportedLanguage = keyof typeof resources;

function detectLanguage(): SupportedLanguage {
  const locales = getLocales();
  const primary = locales[0]?.languageCode ?? 'ko';
  if (primary === 'en') return 'en';
  return 'ko';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
