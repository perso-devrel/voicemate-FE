import { Image, View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/constants/colors';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
  ringed?: boolean;
}

export function Avatar({ uri, size = 48, style, ringed = false }: AvatarProps) {
  const radius = size / 2;
  const ringPad = ringed ? 2 : 0;
  const inner = (
    <View
      style={[
        styles.inner,
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: ringed ? 0 : 1,
          borderColor: colors.borderSoft,
        },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <Ionicons name="person" size={size * 0.5} color={colors.white} />
      )}
    </View>
  );

  if (ringed) {
    return (
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.ring,
          {
            width: size + ringPad * 2,
            height: size + ringPad * 2,
            borderRadius: (size + ringPad * 2) / 2,
            padding: ringPad,
          },
          style,
        ]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return <View style={style}>{inner}</View>;
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
