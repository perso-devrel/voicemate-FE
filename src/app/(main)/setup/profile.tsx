import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  BackHandler,
  Keyboard,
  Platform,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageProficiencyEditor } from '@/components/ui/LanguageProficiencyEditor';
import { BioPhrasePicker } from '@/components/setup/BioPhrasePicker';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_NATIONALITIES, type NationalityCode } from '@/constants/nationalities';
import { INTEREST_OPTIONS, MAX_INTERESTS } from '@/constants/interests';
import type { LanguageProficiency, ProfileUpsertRequest } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

// Auto-format digits as YYYY-MM-DD while the user types.
const formatBirthDate = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { profile, loading, upsertProfile } = useProfile();
  const navigation = useNavigation();
  const voiceReady = profile?.voice_clone_status === 'ready';

  // First-time user: back = logout
  useEffect(() => {
    if (profile) return;

    navigation.setOptions({
      headerShown: true,
      headerTitle: '',
    });

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
  }, [profile, navigation]);

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

  const [form, setForm] = useState<ProfileUpsertRequest>({
    display_name: '',
    birth_date: '',
    gender: 'male',
    nationality: '',
    languages: [],
    bio: '',
    interests: [],
  });
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const bioAnchorY = useRef(0);

  useEffect(() => {
    if (profile) {
      // Pre-006 profile rows may not yet have `languages` populated. Synthesize
      // a single Lv.3 entry from the legacy `language` so the form has a
      // sensible starting state rather than appearing empty.
      const initialLanguages: LanguageProficiency[] =
        profile.languages && profile.languages.length > 0
          ? profile.languages
          : profile.language
            ? [{ code: profile.language, level: 3 }]
            : [];
      setForm({
        display_name: profile.display_name,
        birth_date: profile.birth_date,
        gender: profile.gender,
        nationality: profile.nationality,
        languages: initialLanguages,
        bio: profile.bio ?? '',
        interests: profile.interests,
      });
    }
  }, [profile]);

  const updateField = <K extends keyof ProfileUpsertRequest>(
    key: K,
    value: ProfileUpsertRequest[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Map localized interest labels -> ids so selection survives language changes.
  const labelToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of INTEREST_OPTIONS) {
      map.set(t(opt.labelKey), opt.id);
    }
    return map;
  }, [t]);

  const selectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const label of form.interests ?? []) {
      const id = labelToId.get(label);
      if (id) ids.add(id);
    }
    return ids;
  }, [form.interests, labelToId]);

  const toggleInterest = (id: string, label: string) => {
    const current = form.interests ?? [];
    if (selectedIds.has(id)) {
      updateField(
        'interests',
        current.filter((v) => v !== label),
      );
      return;
    }
    if (current.length >= MAX_INTERESTS) return;
    updateField('interests', [...current, label]);
  };

  const handleSubmit = async () => {
    if (!form.nationality) {
      Alert.alert(t('common.error'), t('setupProfile.selectNationalityRequired'));
      return;
    }
    if (!form.languages || form.languages.length === 0) {
      Alert.alert(t('common.error'), t('setupProfile.addAtLeastOneLanguage'));
      return;
    }
    try {
      const payload: ProfileUpsertRequest = {
        ...form,
        bio: form.bio || null,
      };
      await upsertProfile(payload);
      if (!profile) {
        router.replace('/(main)/setup/voice');
      } else {
        router.back();
      }
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
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 40 + kbHeight }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        {profile ? t('setupProfile.editProfile') : t('setupProfile.createProfile')}
      </Text>

      <Input
        label={t('setupProfile.displayName')}
        value={form.display_name}
        onChangeText={(v) => updateField('display_name', v)}
        placeholder={t('setupProfile.displayNamePlaceholder')}
        maxLength={50}
      />

      <Input
        label={t('setupProfile.birthDate')}
        value={form.birth_date}
        onChangeText={(v) => updateField('birth_date', formatBirthDate(v))}
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
            onPress={() => updateField('gender', g)}
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
        <Text
          style={[
            styles.selectText,
            !form.nationality && styles.selectPlaceholder,
          ]}
        >
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
                  updateField('nationality', code as NationalityCode);
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
        value={form.languages ?? []}
        onChange={(next) => updateField('languages', next)}
        emptyHint={t('setupProfile.languagesHint')}
      />

      <View
        onLayout={(e) => {
          bioAnchorY.current = e.nativeEvent.layout.y;
        }}
      >
        <Text style={styles.label}>{t('setupProfile.bio')}</Text>
        <Text style={styles.hint}>{t('setupProfile.bioPicker.subtitle')}</Text>
        <BioPhrasePicker
          value={form.bio ?? ''}
          onChange={(v) => updateField('bio', v)}
          language={form.languages?.[0]?.code ?? form.language ?? 'ko'}
          disabled={!voiceReady}
          lockedHint={!voiceReady ? t('setupProfile.bioLockedHint') : undefined}
        />
      </View>

      <Text style={styles.label}>
        {t('setupProfile.interests', { count: form.interests?.length ?? 0 })}
      </Text>
      <Text style={styles.hint}>{t('setupProfile.interestsHint')}</Text>
      <View style={styles.chipRow}>
        {INTEREST_OPTIONS.map(({ id, labelKey }) => {
          const label = t(labelKey);
          const selected = selectedIds.has(id);
          const disabled =
            !selected && (form.interests?.length ?? 0) >= MAX_INTERESTS;
          return (
            <Pressable
              key={id}
              disabled={disabled}
              style={[
                styles.chip,
                selected && styles.chipActive,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => toggleInterest(id, label)}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipActiveText,
                  disabled && styles.chipDisabledText,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={profile ? t('common.save') : t('common.next')}
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: 24 }}
      />

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
    fontSize: 28,
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
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -4,
    marginBottom: 8,
    fontFamily: fonts.regular,
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
  selectBtnOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  selectPlaceholder: {
    color: colors.textLight,
  },
  dropdownPanel: {
    padding: 12,
    marginTop: -4,
    marginBottom: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chipActiveText: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  chipDisabledText: {
    color: colors.textLight,
  },
});
