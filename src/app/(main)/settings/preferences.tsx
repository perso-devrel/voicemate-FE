import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { usePreferences } from '@/hooks/usePreferences';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_LANGUAGES, isLanguageCode } from '@/constants/languages';
import { MIN_AGE, MAX_AGE, validateAgeRange } from '@/utils/preferences';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const { preferences, loading, loadPreferences, updatePreferences } = usePreferences();
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('100');
  const [genders, setGenders] = useState<('male' | 'female' | 'other')[]>([...GENDER_OPTIONS]);
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (preferences) {
      setMinAge(String(preferences.min_age));
      setMaxAge(String(preferences.max_age));
      setGenders(preferences.preferred_genders);
      // Drop any legacy/invalid entries so the UI stays consistent with supported codes
      setLanguages(preferences.preferred_languages.filter(isLanguageCode));
    }
  }, [preferences]);

  const toggleGender = (g: 'male' | 'female' | 'other') => {
    setGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const toggleLanguage = (code: string) => {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  };

  const handleSave = async () => {
    const ageCheck = validateAgeRange(minAge, maxAge);
    if (!ageCheck.ok) {
      const message =
        ageCheck.error === 'min-greater-than-max'
          ? t('preferences.invalidAgeRange')
          : t('preferences.ageOutOfBounds', { min: MIN_AGE, max: MAX_AGE });
      Alert.alert(t('common.error'), message);
      return;
    }
    try {
      await updatePreferences({
        min_age: ageCheck.min,
        max_age: ageCheck.max,
        preferred_genders: genders,
        preferred_languages: languages,
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const genderLabel = (g: typeof GENDER_OPTIONS[number]) => {
    if (g === 'male') return t('setupProfile.genderMale');
    if (g === 'female') return t('setupProfile.genderFemale');
    return t('setupProfile.genderOther');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('preferences.title')}</Text>

      <Input
        label={t('preferences.minAge')}
        value={minAge}
        onChangeText={setMinAge}
        keyboardType="number-pad"
      />
      <Input
        label={t('preferences.maxAge')}
        value={maxAge}
        onChangeText={setMaxAge}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>{t('preferences.preferredGenders')}</Text>
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

      <Text style={styles.label}>{t('preferences.preferredLanguages')}</Text>
      <View style={styles.langRow}>
        {SUPPORTED_LANGUAGES.map(({ code, labelKey }) => {
          const selected = languages.includes(code);
          return (
            <Pressable
              key={code}
              onPress={() => toggleLanguage(code)}
              style={[styles.langChip, selected && styles.langChipActive]}
            >
              <Text style={[styles.langChipText, selected && styles.langChipActiveText]}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {t('preferences.leaveEmptyAllLanguages')}
      </Text>

      <Button title={t('common.save')} onPress={handleSave} loading={loading} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  genderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  genderActiveText: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  langChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  langChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  langChipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  langChipActiveText: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
