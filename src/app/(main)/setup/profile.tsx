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
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/constants/languages';
import type { ProfileUpsertRequest } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { profile, loading, upsertProfile } = useProfile();
  const navigation = useNavigation();

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

  const [form, setForm] = useState<ProfileUpsertRequest>({
    display_name: '',
    birth_date: '',
    gender: 'male',
    nationality: '',
    language: '',
    bio: '',
    interests: [],
  });
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name,
        birth_date: profile.birth_date,
        gender: profile.gender,
        nationality: profile.nationality,
        language: profile.language,
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

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed || (form.interests?.length ?? 0) >= 10) return;
    updateField('interests', [...(form.interests ?? []), trimmed]);
    setInterestInput('');
  };

  const removeInterest = (index: number) => {
    updateField(
      'interests',
      (form.interests ?? []).filter((_, i) => i !== index),
    );
  };

  const handleSubmit = async () => {
    if (!form.language) {
      Alert.alert(t('common.error'), t('setupProfile.selectLanguageRequired'));
      return;
    }
    try {
      const payload: ProfileUpsertRequest = {
        ...form,
        bio: form.bio || null,
      };
      await upsertProfile(payload);
      if (!profile) {
        // First-time setup - go to voice setup
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        onChangeText={(v) => updateField('birth_date', v)}
        placeholder={t('setupProfile.birthDatePlaceholder')}
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

      <Input
        label={t('setupProfile.nationality')}
        value={form.nationality}
        onChangeText={(v) => updateField('nationality', v)}
        placeholder={t('setupProfile.nationalityPlaceholder')}
        maxLength={5}
      />

      <Text style={styles.label}>{t('setupProfile.language')}</Text>
      <View style={styles.langRow}>
        {SUPPORTED_LANGUAGES.map(({ code, labelKey }) => {
          const selected = form.language === code;
          return (
            <Pressable
              key={code}
              style={[styles.langChip, selected && styles.langChipActive]}
              onPress={() => updateField('language', code as LanguageCode)}
            >
              <Text style={[styles.langChipText, selected && styles.langChipActiveText]}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label={t('setupProfile.bio')}
        value={form.bio ?? ''}
        onChangeText={(v) => updateField('bio', v)}
        placeholder={t('setupProfile.bioPlaceholder')}
        multiline
        maxLength={500}
        style={{ height: 100, textAlignVertical: 'top' }}
      />

      <Text style={styles.label}>
        {t('setupProfile.interests', { count: form.interests?.length ?? 0 })}
      </Text>
      <View style={styles.interestInput}>
        <Input
          value={interestInput}
          onChangeText={setInterestInput}
          placeholder={t('setupProfile.addInterest')}
          maxLength={30}
          onSubmitEditing={addInterest}
        />
      </View>
      <View style={styles.tags}>
        {(form.interests ?? []).map((tag, i) => (
          <Pressable key={i} onPress={() => removeInterest(i)} style={styles.tag}>
            <Text style={styles.tagText}>{tag} x</Text>
          </Pressable>
        ))}
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
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    fontWeight: '600',
  },
  interestInput: {
    marginBottom: 0,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 13,
    color: colors.white,
  },
});
