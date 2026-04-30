import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { INTEREST_OPTIONS, MAX_INTERESTS } from '@/constants/interests';

export default function EditInterestsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, loading, upsertProfile } = useProfile();
  const [selectedLabels, setSelectedLabels] = useState<string[]>(profile?.interests ?? []);

  useEffect(() => {
    if (profile) setSelectedLabels(profile.interests);
  }, [profile]);

  const labelToId = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of INTEREST_OPTIONS) map.set(t(opt.labelKey), opt.id);
    return map;
  }, [t]);

  const selectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const label of selectedLabels) {
      const id = labelToId.get(label);
      if (id) ids.add(id);
    }
    return ids;
  }, [selectedLabels, labelToId]);

  const toggleInterest = (id: string, label: string) => {
    if (selectedIds.has(id)) {
      setSelectedLabels((prev) => prev.filter((v) => v !== label));
      return;
    }
    if (selectedLabels.length >= MAX_INTERESTS) return;
    setSelectedLabels((prev) => [...prev, label]);
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      await upsertProfile({
        display_name: profile.display_name,
        birth_date: profile.birth_date,
        gender: profile.gender,
        nationality: profile.nationality,
        language: profile.language,
        voice_intro: profile.voice_intro,
        interests: selectedLabels,
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={1}
        total={1}
        title={t('profile.interestsSettings')}
        subtitle={t('profile.editInterestsSubtitle')}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom + 88 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          {t('setupProfile.interests', { count: selectedLabels.length })}
        </Text>
        <Text style={styles.hint}>{t('setupProfile.interestsHint')}</Text>

        <View style={styles.chipRow}>
          {INTEREST_OPTIONS.map(({ id, labelKey }) => {
            const label = t(labelKey);
            const selected = selectedIds.has(id);
            const disabled = !selected && selectedLabels.length >= MAX_INTERESTS;
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

      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button title={t('common.save')} onPress={handleSave} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, fontFamily: fonts.regular },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipActiveText: { color: colors.white },
  chipDisabledText: { color: colors.textLight },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
