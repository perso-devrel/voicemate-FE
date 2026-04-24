import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  BackHandler,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { LanguageProficiencyEditor } from '@/components/ui/LanguageProficiencyEditor';
import { useAuthStore } from '@/stores/authStore';
import { useSignupDraftStore, type Gender } from '@/stores/signupDraftStore';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_NATIONALITIES, type NationalityCode } from '@/constants/nationalities';
import type { LanguageProficiency } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

const formatBirthDate = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

export default function SetupStep1() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const draft = useSignupDraftStore();

  // Wizard entry: swipe-back / hardware-back = logout (same policy as the
  // original first-time setup screen).
  useEffect(() => {
    const onHardwareBack = () => {
      useAuthStore.getState().logout();
      return true;
    };
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      useAuthStore.getState().logout();
    });
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation]);

  const [form, setForm] = useState({
    display_name: draft.display_name,
    birth_date: draft.birth_date,
    gender: draft.gender as Gender,
    nationality: draft.nationality,
    languages: draft.languages,
  });
  const [nationalityOpen, setNationalityOpen] = useState(false);

  const setLanguages = (next: LanguageProficiency[]) =>
    setForm((f) => ({ ...f, languages: next }));

  const handleNext = () => {
    if (!form.display_name.trim()) {
      Alert.alert(t('common.error'), t('signupWizard.displayNameRequired'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date)) {
      Alert.alert(t('common.error'), t('signupWizard.birthDateRequired'));
      return;
    }
    if (!form.nationality) {
      Alert.alert(t('common.error'), t('setupProfile.selectNationalityRequired'));
      return;
    }
    if (form.languages.length === 0) {
      Alert.alert(t('common.error'), t('setupProfile.addAtLeastOneLanguage'));
      return;
    }
    draft.setStep1({
      display_name: form.display_name.trim(),
      birth_date: form.birth_date,
      gender: form.gender,
      nationality: form.nationality,
      languages: form.languages,
    });
    router.push('/(main)/setup/step2');
  };

  const genderLabel = (g: typeof GENDER_OPTIONS[number]) => {
    if (g === 'male') return t('setupProfile.genderMale');
    if (g === 'female') return t('setupProfile.genderFemale');
    return t('setupProfile.genderOther');
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={1}
        title={t('signupWizard.step1Title')}
        subtitle={t('signupWizard.step1Subtitle')}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
      <Input
        label={t('setupProfile.displayName')}
        value={form.display_name}
        onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))}
        placeholder={t('setupProfile.displayNamePlaceholder')}
        maxLength={50}
      />

      <Input
        label={t('setupProfile.birthDate')}
        value={form.birth_date}
        onChangeText={(v) => setForm((f) => ({ ...f, birth_date: formatBirthDate(v) }))}
        placeholder={t('setupProfile.birthDatePlaceholder')}
        keyboardType="number-pad"
        maxLength={10}
      />

      <Text style={styles.label}>{t('setupProfile.gender')}</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((g) => (
          <Pressable
            key={g}
            style={[styles.genderBtn, form.gender === g && styles.genderActive]}
            onPress={() => setForm((f) => ({ ...f, gender: g }))}
          >
            <Text style={[styles.genderText, form.gender === g && styles.genderActiveText]}>
              {genderLabel(g)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('setupProfile.nationality')}</Text>
      <Pressable
        style={[styles.selectBtn, nationalityOpen && styles.selectBtnOpen]}
        onPress={() => setNationalityOpen((v) => !v)}
      >
        <Text style={[styles.selectText, !form.nationality && styles.selectPlaceholder]}>
          {form.nationality
            ? t(`nationalities.${form.nationality}`)
            : t('setupProfile.nationalityPlaceholder')}
        </Text>
        <Ionicons
          name={nationalityOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {nationalityOpen && (
        <View style={[styles.chipRow, styles.dropdownPanel]}>
          {SUPPORTED_NATIONALITIES.map(({ code, labelKey }) => {
            const selected = form.nationality === code;
            return (
              <Pressable
                key={code}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => {
                  setForm((f) => ({ ...f, nationality: code as NationalityCode }));
                  setNationalityOpen(false);
                }}
              >
                <Text style={[styles.chipText, selected && styles.chipActiveText]}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>{t('setupProfile.languages')}</Text>
      <LanguageProficiencyEditor
        value={form.languages}
        onChange={setLanguages}
        emptyHint={t('setupProfile.languagesHint')}
      />

      <Button title={t('common.next')} onPress={handleNext} style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 8,
  },
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
  genderActiveText: { color: colors.white, fontFamily: fonts.semibold },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  selectBtnOpen: { borderColor: colors.primary, backgroundColor: colors.white },
  selectText: { fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  selectPlaceholder: { color: colors.textLight },
  dropdownPanel: {
    padding: 12,
    marginTop: -4,
    marginBottom: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
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
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipActiveText: { color: colors.white, fontFamily: fonts.semibold },
});
