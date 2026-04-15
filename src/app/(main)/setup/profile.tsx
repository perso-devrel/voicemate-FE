import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import type { ProfileUpsertRequest } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

export default function ProfileSetupScreen() {
  const { profile, loading, upsertProfile } = useProfile();

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
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{profile ? 'Edit Profile' : 'Create Profile'}</Text>

      <Input
        label="Display Name"
        value={form.display_name}
        onChangeText={(v) => updateField('display_name', v)}
        placeholder="Your name"
        maxLength={50}
      />

      <Input
        label="Birth Date"
        value={form.birth_date}
        onChangeText={(v) => updateField('birth_date', v)}
        placeholder="YYYY-MM-DD"
        maxLength={10}
      />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((g) => (
          <Pressable
            key={g}
            style={[styles.genderBtn, form.gender === g && styles.genderActive]}
            onPress={() => updateField('gender', g)}
          >
            <Text style={[styles.genderText, form.gender === g && styles.genderActiveText]}>
              {g}
            </Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="Nationality"
        value={form.nationality}
        onChangeText={(v) => updateField('nationality', v)}
        placeholder="e.g. KR"
        maxLength={5}
      />

      <Input
        label="Language"
        value={form.language}
        onChangeText={(v) => updateField('language', v)}
        placeholder="e.g. ko"
        maxLength={5}
      />

      <Input
        label="Bio (optional)"
        value={form.bio ?? ''}
        onChangeText={(v) => updateField('bio', v)}
        placeholder="Tell about yourself"
        multiline
        maxLength={500}
        style={{ height: 100, textAlignVertical: 'top' }}
      />

      <Text style={styles.label}>Interests ({form.interests?.length ?? 0}/10)</Text>
      <View style={styles.interestInput}>
        <Input
          value={interestInput}
          onChangeText={setInterestInput}
          placeholder="Add interest"
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
        title={profile ? 'Save' : 'Next'}
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
