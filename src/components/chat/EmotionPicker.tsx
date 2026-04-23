import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import {
  EMOTION_OPTIONS,
  getEmotionMeta,
} from '@/constants/emotions';
import type { Emotion } from '@/types';

interface EmotionPickerProps {
  value: Emotion;
  expanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Compact toggle (left of the input bar) + horizontally-scrollable chip row
 * that appears above the input bar when expanded. The picker stays in-place so
 * the keyboard never closes on tap.
 *
 * Layout note: callers are responsible for positioning the chip row and
 * extending their bottom-pad calculation by `EMOTION_PICKER_ROW_HEIGHT` while
 * `expanded` is true so the last chat bubble isn't occluded.
 */
export function EmotionPicker({
  value,
  expanded,
  onToggleExpanded,
}: EmotionPickerProps) {
  const { t } = useTranslation();
  const isDefault = value === 'neutral';
  const currentMeta = getEmotionMeta(value);

  return (
    <Pressable
      onPress={onToggleExpanded}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t('chat.emotionPicker.toggleLabel')}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.toggle,
        !isDefault && styles.toggleActive,
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      {isDefault ? (
        <Ionicons name="happy-outline" size={22} color={colors.primary} />
      ) : (
        <Text style={styles.toggleEmoji}>{currentMeta.emoji}</Text>
      )}
    </Pressable>
  );
}

interface EmotionChipRowProps {
  value: Emotion;
  onSelect: (emotion: Emotion) => void;
}

/**
 * The row of emotion chips, rendered separately so the chat screen can absolutely
 * position it directly above the input bar (above the keyboard).
 */
export function EmotionChipRow({ value, onSelect }: EmotionChipRowProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      keyboardShouldPersistTaps="always"
    >
      {EMOTION_OPTIONS.map((meta) => {
        const selected = meta.value === value;
        return (
          <Pressable
            key={meta.value}
            onPress={() => onSelect(meta.value)}
            accessibilityRole="button"
            accessibilityLabel={t(meta.labelKey)}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              !selected && styles.chipUnselected,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            {selected ? (
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chipInner}
              >
                <Text style={styles.chipEmoji}>{meta.emoji}</Text>
                <Text style={[styles.chipLabel, styles.chipLabelSelected]}>
                  {t(meta.labelKey)}
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.chipInner}>
                <Text style={styles.chipEmoji}>{meta.emoji}</Text>
                <Text style={styles.chipLabel}>{t(meta.labelKey)}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Approximate vertical space the chip row consumes once expanded (chip height
 * + vertical padding). Consumers add this to `listBottomPad` to keep the last
 * message visible.
 */
export const EMOTION_PICKER_ROW_HEIGHT = 56;

const styles = StyleSheet.create({
  toggle: {
    width: 40,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  toggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  toggleEmoji: {
    fontSize: 20,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    ...shadows.soft,
  },
  chipUnselected: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  chipEmoji: {
    fontSize: 16,
    lineHeight: 18,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.text,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
  },
  chipLabelSelected: {
    color: colors.white,
  },
});
