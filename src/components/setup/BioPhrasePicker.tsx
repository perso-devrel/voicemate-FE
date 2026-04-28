import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import {
  BIO_PHRASES,
  findPresetByText,
  getBioPhraseText,
  type BioPhraseCategory,
} from '@/constants/bioPhrases';

interface BioPhrasePickerProps {
  value: string;
  onChange: (text: string) => void;
  // Profile language used for both displaying the localized preset body and
  // the text written back to `bio`. Keeping these aligned ensures the cloned
  // voice synthesizes the same language it was trained on.
  language: string;
  disabled?: boolean;
  lockedHint?: string;
}

const CATEGORY_TINTS: Record<BioPhraseCategory, string> = {
  taste: '#F6B5C8',
  simple: '#B8C8DD',
  sincere: '#E8A88C',
  flutter: '#E27AA0',
  confidence: '#F4A261',
  aegyo: '#D8A8E0',
};

const CUSTOM_TINT = '#C8ADBA';

export function BioPhrasePicker({
  value,
  onChange,
  language,
  disabled,
  lockedHint,
}: BioPhrasePickerProps) {
  const { t } = useTranslation();

  // Derive initial selection state from the incoming `value`. Empty value =
  // nothing selected yet. Matching preset = that preset selected. Otherwise =
  // custom mode with the value as the typed text.
  const initialPreset = useMemo(() => findPresetByText(value), [value]);
  const initialIsCustom = value.length > 0 && !initialPreset;

  const [selectedId, setSelectedId] = useState<string | null>(
    initialPreset?.id ?? (initialIsCustom ? 'custom' : null),
  );
  const [customText, setCustomText] = useState(initialIsCustom ? value : '');

  // Hold the latest onChange in a ref so the resync effect doesn't re-fire on
  // every parent render (callers like setup/profile.tsx pass an inline arrow).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Re-sync when the parent feeds a new value (e.g. profile loaded async) or
  // when the user's language changes. If the stored bio matches a preset in a
  // different language, promote it to the current-language version so the
  // saved bio stays aligned with the voice clone's language.
  useEffect(() => {
    const preset = findPresetByText(value);
    if (preset) {
      setSelectedId(preset.id);
      const localized = getBioPhraseText(preset, language);
      if (localized !== value) onChangeRef.current(localized);
      return;
    }
    if (value.length > 0) {
      setSelectedId('custom');
      setCustomText(value);
    }
  }, [value, language]);

  const handleSelectPreset = (id: string, text: string) => {
    if (disabled) return;
    setSelectedId(id);
    onChange(text);
  };

  const handleSelectCustom = () => {
    if (disabled) return;
    setSelectedId('custom');
    onChange(customText);
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    if (selectedId === 'custom') onChange(text);
  };

  return (
    <View style={styles.container}>
      {BIO_PHRASES.map((phrase) => {
        const selected = selectedId === phrase.id;
        const localizedText = getBioPhraseText(phrase, language);
        return (
          <Pressable
            key={phrase.id}
            disabled={disabled}
            onPress={() => handleSelectPreset(phrase.id, localizedText)}
            style={[
              styles.card,
              selected && styles.cardSelected,
              disabled && styles.cardDisabled,
            ]}
          >
            <View
              style={[
                styles.tag,
                { backgroundColor: CATEGORY_TINTS[phrase.category] },
              ]}
            >
              <Text style={styles.tagText}>
                {t(`setupProfile.bioPicker.category.${phrase.category}`)}
              </Text>
            </View>
            <Text
              style={[styles.phraseText, selected && styles.phraseTextSelected]}
            >
              {localizedText}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        disabled={disabled}
        onPress={handleSelectCustom}
        style={[
          styles.card,
          selectedId === 'custom' && styles.cardSelected,
          disabled && styles.cardDisabled,
        ]}
      >
        <View style={[styles.tag, { backgroundColor: CUSTOM_TINT }]}>
          <Text style={styles.tagText}>
            {t('setupProfile.bioPicker.category.custom')}
          </Text>
        </View>
        <CustomInput
          value={customText}
          onChangeText={handleCustomTextChange}
          editable={!disabled && selectedId === 'custom'}
          placeholder={t('setupProfile.bioPicker.customPlaceholder')}
        />
      </Pressable>

      {disabled && lockedHint ? (
        <Text style={styles.lockHint}>{lockedHint}</Text>
      ) : null}
    </View>
  );
}

function CustomInput({
  value,
  onChangeText,
  editable,
  placeholder,
}: Pick<TextInputProps, 'value' | 'onChangeText' | 'editable' | 'placeholder'>) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholder={placeholder}
      placeholderTextColor={colors.textLight}
      multiline
      maxLength={500}
      style={styles.customInput}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  tagText: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: colors.white,
    letterSpacing: 0.4,
  },
  phraseText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  phraseTextSelected: {
    color: colors.primaryDark,
    fontFamily: fonts.medium,
  },
  customInput: {
    minHeight: 60,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    fontFamily: fonts.regular,
    textAlignVertical: 'top',
    padding: 0,
  },
  lockHint: {
    fontSize: 12,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
    marginTop: 4,
  },
});
