import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/constants/languages';

// Common props between both modes — emptyHint, hint copy, etc.
interface BaseProps {
  // Empty-state hint shown above the chips. Caller-controlled so profile vs.
  // preference screens can tailor wording.
  emptyHint?: string;
  // Codes to omit from the picker. Preferences screen passes the user's own
  // primary language here because BE blocks same-primary matches outright —
  // surfacing the option would let users pick something that has no effect.
  excludeCodes?: string[];
}

interface SingleProps extends BaseProps {
  mode: 'single';
  // Currently selected language code, or null when nothing is picked yet.
  value: LanguageCode | null;
  onChange: (next: LanguageCode | null) => void;
  // Placeholder shown in the collapsed select button when no value is set.
  // Falls back to setupProfile.languagePlaceholder when omitted.
  placeholder?: string;
  // Renders the collapsed select button with the error border style — mirrors
  // the nationality picker so step1's two pickers share the same affordance.
  hasError?: boolean;
}

interface MultiProps extends BaseProps {
  mode: 'multi';
  // Selected codes. Order is preserved so callers can show "first added first".
  value: LanguageCode[];
  onChange: (next: LanguageCode[]) => void;
  // Cap on number of languages (defaults to all whitelisted languages).
  max?: number;
}

type LanguagePickerProps = SingleProps | MultiProps;

/**
 * Reusable language picker for both profile (single, required) and matching
 * preferences (multi, optional). Mig 009 collapsed the data model down to a
 * scalar code on profile and a code-only array on preferences, so the editor
 * no longer surfaces proficiency levels.
 *
 * Single mode renders the supported languages as chips and treats taps as
 * exclusive selection (replacing the current value). Multi mode renders the
 * selected languages as removable rows and the remaining ones in an
 * expandable picker panel — same shape as the legacy preference UI minus the
 * level chips.
 */
export function LanguagePicker(props: LanguagePickerProps) {
  const { t } = useTranslation();
  const excludedSet = useMemo(
    () => new Set(props.excludeCodes ?? []),
    [props.excludeCodes],
  );

  if (props.mode === 'single') {
    return <SingleLanguagePicker {...props} excludedSet={excludedSet} t={t} />;
  }
  return <MultiLanguagePicker {...props} excludedSet={excludedSet} t={t} />;
}

function SingleLanguagePicker({
  value,
  onChange,
  placeholder,
  hasError,
  excludedSet,
  t,
}: SingleProps & { excludedSet: Set<string>; t: ReturnType<typeof useTranslation>['t'] }) {
  const [open, setOpen] = useState(false);
  const visible = useMemo(
    () => SUPPORTED_LANGUAGES.filter((l) => !excludedSet.has(l.code)),
    [excludedSet],
  );

  const selectedLabelKey = value
    ? visible.find((l) => l.code === value)?.labelKey
    : null;

  return (
    <View style={styles.singleContainer}>
      <Pressable
        style={[
          styles.selectBtn,
          open && styles.selectBtnOpen,
          hasError ? styles.selectBtnError : null,
        ]}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.selectText, value == null && styles.selectPlaceholder]}>
          {selectedLabelKey
            ? t(selectedLabelKey)
            : (placeholder ?? t('setupProfile.languagePlaceholder'))}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {open && (
        <View style={[styles.chipRow, styles.dropdownPanel]}>
          {visible.map(({ code, labelKey }) => {
            const selected = value === code;
            return (
              <Pressable
                key={code}
                onPress={() => {
                  onChange(code as LanguageCode);
                  setOpen(false);
                }}
                style={[styles.dropdownChip, selected && styles.dropdownChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.dropdownChipText,
                    selected && styles.dropdownChipActiveText,
                  ]}
                >
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MultiLanguagePicker({
  value,
  onChange,
  emptyHint,
  excludedSet,
  max,
  t,
}: MultiProps & { excludedSet: Set<string>; t: ReturnType<typeof useTranslation>['t'] }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const usedCodes = useMemo(() => new Set(value), [value]);
  const available = useMemo(
    () =>
      SUPPORTED_LANGUAGES.filter(
        (l) => !usedCodes.has(l.code as LanguageCode) && !excludedSet.has(l.code),
      ),
    [usedCodes, excludedSet],
  );
  const cap = max ?? SUPPORTED_LANGUAGES.length;
  const canAdd = value.length < cap && available.length > 0;

  const addLanguage = (code: LanguageCode) => {
    if (usedCodes.has(code)) return;
    onChange([...value, code]);
    setPickerOpen(false);
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      {value.length === 0 && emptyHint ? (
        <Text style={styles.hint}>{emptyHint}</Text>
      ) : null}

      {value.map((code, index) => (
        <View key={`${code}-${index}`} style={styles.row}>
          <Text style={styles.rowTitle}>{t(`languages.${code}`)}</Text>
          <Pressable
            onPress={() => removeAt(index)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('setupProfile.removeLanguage')}
          >
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </Pressable>
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
              {available.map(({ code, labelKey }) => (
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
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Single-mode mirrors the nationality dropdown in setup/step1.tsx for
  // visual parity — collapsed select button + chip panel that closes on pick.
  singleContainer: {},
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
  },
  selectBtnOpen: { borderColor: colors.primary, backgroundColor: colors.white },
  selectBtnError: { borderColor: colors.error },
  selectText: { fontSize: 14, color: colors.text, fontFamily: fonts.medium },
  selectPlaceholder: { color: colors.textLight },
  dropdownPanel: {
    padding: 12,
    marginTop: 4,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  dropdownChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dropdownChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dropdownChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  dropdownChipActiveText: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.text,
    flexShrink: 1,
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
    fontSize: 13,
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
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
});
