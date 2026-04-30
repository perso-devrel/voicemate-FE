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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { LanguageProficiencyEditor } from '@/components/ui/LanguageProficiencyEditor';
import { useSignupDraftStore } from '@/stores/signupDraftStore';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_NATIONALITIES } from '@/constants/nationalities';
import { MIN_AGE, MAX_AGE, validateAgeRange } from '@/utils/preferences';
import type { LanguageProficiency, PreferenceUpdateRequest } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export default function SetupStep4() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useSignupDraftStore();

  const [minAge, setMinAge] = useState(String(draft.preferences?.min_age ?? MIN_AGE));
  const [maxAge, setMaxAge] = useState(String(draft.preferences?.max_age ?? MAX_AGE));
  const [genders, setGenders] = useState<('male' | 'female' | 'other')[]>(
    draft.preferences?.preferred_genders ?? [...GENDER_OPTIONS],
  );
  const [languages, setLanguages] = useState<LanguageProficiency[]>(
    draft.preferences?.preferred_languages_detail ?? [],
  );
  const [nationalities, setNationalities] = useState<string[]>(
    draft.preferences?.preferred_nationalities ?? [],
  );
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

  const toggleGender = (g: 'male' | 'female' | 'other') => {
    setGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const toggleNationality = (code: string) => {
    setNationalities((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const genderLabel = (g: typeof GENDER_OPTIONS[number]) => {
    if (g === 'male') return t('setupProfile.genderMale');
    if (g === 'female') return t('setupProfile.genderFemale');
    return t('setupProfile.genderOther');
  };

  const handleNext = () => {
    const ageCheck = validateAgeRange(minAge, maxAge);
    if (!ageCheck.ok) {
      const message =
        ageCheck.error === 'min-greater-than-max'
          ? t('preferences.invalidAgeRange')
          : t('preferences.ageOutOfBounds', { min: MIN_AGE, max: MAX_AGE });
      Alert.alert(t('common.error'), message);
      return;
    }
    const prefs: PreferenceUpdateRequest = {
      min_age: ageCheck.min,
      max_age: ageCheck.max,
      preferred_genders: genders,
      preferred_languages_detail: languages,
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
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + Math.max(kbHeight, insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
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

      <View style={styles.actions}>
        <Button title={t('common.next')} onPress={handleNext} style={{ marginTop: 24 }} />
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
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  genderActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  genderText: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  genderActiveText: { color: colors.white },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  actions: { gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
  chipActiveText: { color: colors.white },
});
