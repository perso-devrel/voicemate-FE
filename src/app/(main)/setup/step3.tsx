import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { useSignupDraftStore } from '@/stores/signupDraftStore';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { INTEREST_OPTIONS, MAX_INTERESTS } from '@/constants/interests';

export default function SetupStep3() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useSignupDraftStore();
  const [selectedLabels, setSelectedLabels] = useState<string[]>(draft.interests);

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

  const handleSkip = () => {
    draft.setInterests([]);
    router.push('/(main)/setup/step4');
  };

  const handleNext = () => {
    draft.setInterests(selectedLabels);
    router.push('/(main)/setup/step4');
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={3}
        title={t('signupWizard.step3Title')}
        subtitle={t('signupWizard.step3Subtitle')}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
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

      <View style={styles.actions}>
        <Button title={t('common.next')} onPress={handleNext} />
        <Button title={t('common.skip')} variant="outline" onPress={handleSkip} />
      </View>
      </ScrollView>
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
  chipActiveText: { color: colors.white, fontFamily: fonts.semibold },
  chipDisabledText: { color: colors.textLight },
  actions: { gap: 10, marginTop: 12 },
});
