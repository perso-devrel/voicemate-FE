import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows } from '@/constants/colors';

interface SoftCardProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
  /** Render a blush gradient fill instead of a flat card. */
  tinted?: boolean;
}

export function SoftCard({
  children,
  style,
  padded = true,
  elevated = true,
  tinted = false,
}: SoftCardProps) {
  if (tinted) {
    return (
      <LinearGradient
        colors={[...gradients.blush]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, padded && styles.padded, elevated && shadows.soft, style]}
      >
        {children}
      </LinearGradient>
    );
  }
  return (
    <View
      style={[
        styles.base,
        styles.flat,
        padded && styles.padded,
        elevated && shadows.soft,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  flat: {
    backgroundColor: colors.card,
  },
  padded: {
    padding: 16,
  },
});
