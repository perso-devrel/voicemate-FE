import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/constants/languages';
import type { LanguageLevel, LanguageProficiency } from '@/types';

const LEVELS: LanguageLevel[] = [1, 2, 3];

interface LanguageProficiencyEditorProps {
  // Current entries. Order is preserved; entries[0] is treated as the
  // "primary" by the caller (profile screens use it for translation pipeline).
  value: LanguageProficiency[];
  onChange: (next: LanguageProficiency[]) => void;
  // Empty hint text rendered above the chips. Caller-controlled so the
  // profile and preference screens can tailor wording.
  emptyHint?: string;
  // Cap on number of languages a user can add. Defaults to 10 (matches BE).
  max?: number;
}

// Reusable picker for "list of {code, level}" used in profile setup,
// edit-profile, and matching preferences. Renders one row per added
// language with three Lv chips, plus a chooser at the bottom listing
// languages that haven't been added yet. No level chosen by default
// for newly picked languages — the row defaults to Lv.1 (beginner).
export function LanguageProficiencyEditor({
  value,
  onChange,
  emptyHint,
  max = 10,
}: LanguageProficiencyEditorProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const usedCodes = useMemo(() => new Set(value.map((v) => v.code)), [value]);
  const availableLanguages = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => !usedCodes.has(l.code)),
    [usedCodes],
  );
  const canAdd = value.length < max && availableLanguages.length > 0;

  const addLanguage = (code: LanguageCode) => {
    if (usedCodes.has(code)) return;
    onChange([...value, { code, level: 1 }]);
    setPickerOpen(false);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const setLevel = (index: number, level: LanguageLevel) => {
    onChange(value.map((entry, i) => (i === index ? { ...entry, level } : entry)));
  };

  const levelLabel = (level: LanguageLevel) => {
    if (level === 1) return t('setupProfile.languageLevel1Short');
    if (level === 2) return t('setupProfile.languageLevel2Short');
    return t('setupProfile.languageLevel3Short');
  };

  return (
    <View style={styles.container}>
      {value.length === 0 && emptyHint ? (
        <Text style={styles.hint}>{emptyHint}</Text>
      ) : null}

      {value.map((entry, index) => (
        <View key={`${entry.code}-${index}`} style={styles.row}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle}>{t(`languages.${entry.code}`)}</Text>
            <Pressable
              onPress={() => removeAt(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('setupProfile.removeLanguage')}
            >
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </Pressable>
          </View>
          <View style={styles.levelRow}>
            {LEVELS.map((level) => {
              const selected = entry.level === level;
              return (
                <Pressable
                  key={level}
                  style={[styles.levelChip, selected && styles.levelChipActive]}
                  onPress={() => setLevel(index, level)}
                >
                  <Text style={[styles.levelText, selected && styles.levelTextActive]}>
                    {levelLabel(level)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {canAdd ? (
        <>
          <Pressable
            style={[styles.addBtn, pickerOpen && styles.addBtnOpen]}
            onPress={() => setPickerOpen((v) => !v)}
          >
            <Ionicons
              name={pickerOpen ? 'chevron-up' : 'add'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.addText}>{t('setupProfile.addLanguage')}</Text>
          </Pressable>
          {pickerOpen && (
            <View style={styles.pickerPanel}>
              {availableLanguages.map(({ code, labelKey }) => (
                <Pressable
                  key={code}
                  style={styles.pickerChip}
                  onPress={() => addLanguage(code as LanguageCode)}
                >
                  <Text style={styles.pickerChipText}>{t(labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 10,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 12,
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  levelChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  levelChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  levelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  levelTextActive: {
    color: colors.white,
    fontFamily: fonts.semibold,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  addBtnOpen: {
    backgroundColor: colors.white,
  },
  addText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  pickerPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  pickerChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pickerChipText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.medium,
  },
});
