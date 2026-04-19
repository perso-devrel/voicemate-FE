import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '@/constants/colors';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  ctaLabel?: string;
  onCtaPress?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  subtitle,
  iconName,
  ctaLabel,
  onCtaPress,
  style,
}: EmptyStateProps) {
  const showCta = Boolean(ctaLabel && onCtaPress);
  return (
    <View style={[styles.container, style]}>
      {iconName ? (
        <Ionicons
          name={iconName}
          size={48}
          color={colors.textSecondary}
          style={styles.icon}
        />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {showCta ? (
        <Button
          title={ctaLabel!}
          onPress={onCtaPress!}
          style={styles.cta}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  cta: {
    marginTop: 20,
    paddingHorizontal: 40,
  },
});
