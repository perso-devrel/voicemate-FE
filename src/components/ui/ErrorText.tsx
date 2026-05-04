import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

interface ErrorTextProps {
  children?: string | null;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

export function ErrorText({ children, style, testID }: ErrorTextProps) {
  if (!children) return null;
  return (
    <Text
      style={[styles.text, style]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    color: colors.error,
    fontFamily: fonts.regular,
    marginTop: 6,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
