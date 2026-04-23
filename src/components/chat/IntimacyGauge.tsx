import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { UNLOCK_MAIN_PHOTO_AT, UNLOCK_ALL_PHOTOS_AT } from '@/utils/chat';

interface IntimacyGaugeProps {
  roundTrips: number;
}

export function IntimacyGauge({ roundTrips }: IntimacyGaugeProps) {
  const { t } = useTranslation();
  const clamped = Math.min(roundTrips, UNLOCK_ALL_PHOTOS_AT);
  const progress = clamped / UNLOCK_ALL_PHOTOS_AT;

  let hint: string;
  if (roundTrips >= UNLOCK_ALL_PHOTOS_AT) {
    hint = t('chat.intimacyAllUnlocked');
  } else if (roundTrips >= UNLOCK_MAIN_PHOTO_AT) {
    hint = t('chat.intimacyUntilAll', { count: UNLOCK_ALL_PHOTOS_AT - roundTrips });
  } else {
    hint = t('chat.intimacyUntilMain', { count: UNLOCK_MAIN_PHOTO_AT - roundTrips });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name="heart" size={13} color={colors.primary} />
          <Text style={styles.label}>
            {t('chat.intimacy')} {clamped}/{UNLOCK_ALL_PHOTOS_AT}
          </Text>
        </View>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fillWrap, { width: `${progress * 100}%` }]}>
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        </View>
        {/* Milestone markers at 5/10 */}
        <View
          style={[
            styles.milestone,
            { left: `${(UNLOCK_MAIN_PHOTO_AT / UNLOCK_ALL_PHOTOS_AT) * 100}%` },
            roundTrips >= UNLOCK_MAIN_PHOTO_AT && styles.milestoneReached,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
    position: 'relative',
  },
  fillWrap: {
    height: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
  milestone: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 12,
    marginLeft: -1.5,
    borderRadius: 2,
    backgroundColor: colors.borderSoft,
  },
  milestoneReached: {
    backgroundColor: colors.primaryDark,
  },
});
