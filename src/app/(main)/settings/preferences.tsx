import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageProficiencyEditor } from '@/components/ui/LanguageProficiencyEditor';
import { usePreferences } from '@/hooks/usePreferences';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { isLanguageCode } from '@/constants/languages';
import { SUPPORTED_NATIONALITIES } from '@/constants/nationalities';
import { MIN_AGE, MAX_AGE, validateAgeRange } from '@/utils/preferences';
import type { LanguageProficiency } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const { preferences, loading, loadPreferences, updatePreferences } = usePreferences();
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('100');
  const [genders, setGenders] = useState<('male' | 'female' | 'other')[]>([...GENDER_OPTIONS]);
  const [languages, setLanguages] = useState<LanguageProficiency[]>([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    if (preferences) {
      setMinAge(String(preferences.min_age));
      setMaxAge(String(preferences.max_age));
      setGenders(preferences.preferred_genders);
      // Prefer the new detail array; fall back to synthesizing Lv.1 entries
      // from the legacy codes-only array so pre-006 prefs still load.
      const detail = preferences.preferred_languages_detail;
      if (detail && detail.length > 0) {
        setLanguages(detail.filter((d) => isLanguageCode(d.code)));
      } else {
        setLanguages(
          preferences.preferred_languages
            .filter(isLanguageCode)
            .map((code) => ({ code, level: 1 })),
        );
      }
      setNationalities(preferences.preferred_nationalities ?? []);
    }
  }, [preferences]);

  const toggleGender = (g: 'male' | 'female' | 'other') => {
    setGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const toggleNationality = (code: string) => {
    setNationalities((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
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
        preferred_languages: languages.map((l) => l.code),
        preferred_languages_detail: languages,
        preferred_nationalities: nationalities,
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + kbHeight }]}
      keyboardShouldPersistTaps="handled"
    >
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
      <LanguageProficiencyEditor
        value={languages}
        onChange={setLanguages}
        emptyHint={t('preferences.leaveEmptyAllLanguages')}
      />
      <Text style={styles.hint}>{t('preferences.preferredLevelHint')}</Text>

      <Text style={[styles.label, { marginTop: 20 }]}>
        {t('preferences.preferredNationalities')}
      </Text>
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
      <Text style={styles.hint}>{t('preferences.leaveEmptyAllNationalities')}</Text>

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
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
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
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipActiveText: { color: colors.white, fontFamily: fonts.semibold },
});
