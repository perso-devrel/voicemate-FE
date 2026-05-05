import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { AgeRangeSlider } from '@/components/ui/AgeRangeSlider';
import { useSignupDraftStore } from '@/stores/signupDraftStore';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { isLanguageCode, SUPPORTED_LANGUAGES, type LanguageCode } from '@/constants/languages';
import { SUPPORTED_NATIONALITIES } from '@/constants/nationalities';
import { MIN_AGE, MAX_AGE } from '@/utils/preferences';
import type { PreferenceUpdateRequest } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export default function SetupStep4() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useSignupDraftStore();
  const { profile } = useProfile();
  // BE blocks same-primary-language matches (the app's core differentiator —
  // voice translation only kicks in across language pairs). Hide the user's
  // own primary from the picker so they can't add a language that has no
  // effect on filtering. Mirrors settings/preferences.tsx exactly.
  const ownPrimaryLanguage =
    profile?.language ?? draft.language ?? null;

  const [ageRange, setAgeRange] = useState<{ min: number; max: number }>({
    min: Math.max(MIN_AGE, Math.min(draft.preferences?.min_age ?? MIN_AGE, MAX_AGE)),
    max: Math.max(MIN_AGE, Math.min(draft.preferences?.max_age ?? MAX_AGE, MAX_AGE)),
  });
  const [genders, setGenders] = useState<('male' | 'female' | 'other')[]>(
    draft.preferences?.preferred_genders ?? [...GENDER_OPTIONS],
  );
  const [languages, setLanguages] = useState<LanguageCode[]>(
    (draft.preferences?.preferred_languages ?? []).filter(
      (c): c is LanguageCode => isLanguageCode(c) && c !== ownPrimaryLanguage,
    ),
  );
  const [nationalities, setNationalities] = useState<string[]>(
    draft.preferences?.preferred_nationalities ?? [],
  );

  // Re-sync when ownPrimaryLanguage resolves async (profile arriving after mount).
  useEffect(() => {
    setLanguages((prev) =>
      prev.filter((c) => isLanguageCode(c) && c !== ownPrimaryLanguage),
    );
  }, [ownPrimaryLanguage]);

  const toggleGender = (g: 'male' | 'female' | 'other') => {
    setGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const toggleNationality = (code: string) => {
    setNationalities((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const toggleLanguage = (code: LanguageCode) => {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const genderLabel = (g: typeof GENDER_OPTIONS[number]) => {
    if (g === 'male') return t('setupProfile.genderMale');
    if (g === 'female') return t('setupProfile.genderFemale');
    return t('setupProfile.genderOther');
  };

  const handleNext = () => {
    const prefs: PreferenceUpdateRequest = {
      min_age: ageRange.min,
      max_age: ageRange.max,
      preferred_genders: genders,
      preferred_languages: languages,
      preferred_nationalities: nationalities,
    };
    draft.setPreferences(prefs);
    router.push('/(main)/setup/step5');
  };

  const handleSkip = () => {
    draft.setPreferences(null);
    router.push('/(main)/setup/step5');
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={4}
        title={t('signupWizard.step4Title')}
        subtitle={t('signupWizard.step4Subtitle')}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>{t('preferences.ageRange')}</Text>
        <AgeRangeSlider
          min={MIN_AGE}
          max={MAX_AGE}
          value={ageRange}
          onChange={setAgeRange}
          suffix={t('preferences.ageSuffix', { defaultValue: '' })}
        />

        <Text style={[styles.label, styles.sectionGap]}>{t('preferences.preferredGenders')}</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((g) => (
            <Pressable
              key={g}
              style={[styles.genderBtn, genders.includes(g) && styles.genderActive]}
              onPress={() => toggleGender(g)}
            >
              <Text style={[styles.genderText, genders.includes(g) && styles.genderActiveText]}>
                {genderLabel(g)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, styles.sectionGap]}>
          {t('preferences.preferredNationalities')}
        </Text>
        <Text style={styles.hintBlock}>{t('preferences.leaveEmptyAllNationalities')}</Text>
        <View style={styles.chipRow}>
          {SUPPORTED_NATIONALITIES.map(({ code, labelKey }) => {
            const selected = nationalities.includes(code);
            return (
              <Pressable
                key={code}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => toggleNationality(code)}
              >
                <Text style={[styles.chipText, selected && styles.chipActiveText]}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, styles.sectionGap]}>{t('preferences.preferredLanguages')}</Text>
        <View style={styles.hintList}>
          <Text style={styles.hintLine}>{`• ${t('preferences.leaveEmptyAllLanguages')}`}</Text>
          <Text style={styles.hintLine}>{`• ${t('preferences.sameLanguageBlockedHint')}`}</Text>
        </View>
        <View style={styles.chipRow}>
          {SUPPORTED_LANGUAGES.filter((l) => l.code !== ownPrimaryLanguage).map(
            ({ code, labelKey }) => {
              const selected = languages.includes(code as LanguageCode);
              return (
                <Pressable
                  key={code}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => toggleLanguage(code as LanguageCode)}
                >
                  <Text style={[styles.chipText, selected && styles.chipActiveText]}>
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        <View style={styles.actions}>
          <Button title={t('common.next')} onPress={handleNext} style={{ marginTop: 8 }} />
          <Button title={t('common.skip')} variant="outline" onPress={handleSkip} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, marginBottom: 8 },
  sectionGap: { marginTop: 16 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  genderActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  genderText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    textTransform: 'capitalize',
  },
  genderActiveText: { color: colors.white },
  hintBlock: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginTop: -4,
    marginBottom: 10,
    lineHeight: 18,
  },
  hintList: {
    marginTop: -4,
    marginBottom: 10,
    gap: 6,
  },
  hintLine: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 11, color: colors.textSecondary, fontFamily: fonts.medium },
  chipActiveText: { color: colors.white },
  actions: { gap: 10, marginTop: 16 },
});
