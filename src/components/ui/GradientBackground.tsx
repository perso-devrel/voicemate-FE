import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop, Circle } from 'react-native-svg';
import { gradients } from '@/constants/colors';

type Variant = 'night' | 'dawn' | 'sunset' | 'dusk' | 'blush';

interface GradientBackgroundProps {
  children?: ReactNode;
  variant?: Variant;
  stars?: boolean;
  sun?: boolean;
  style?: ViewStyle;
}

const STAR_FIELD = [
  { cx: 0.08, cy: 0.08, r: 0.8, o: 0.9 },
  { cx: 0.18, cy: 0.14, r: 0.5, o: 0.5 },
  { cx: 0.32, cy: 0.06, r: 0.6, o: 0.7 },
  { cx: 0.48, cy: 0.12, r: 0.4, o: 0.6 },
  { cx: 0.6, cy: 0.05, r: 0.7, o: 0.85 },
  { cx: 0.74, cy: 0.11, r: 0.5, o: 0.55 },
  { cx: 0.88, cy: 0.08, r: 0.6, o: 0.75 },
  { cx: 0.22, cy: 0.2, r: 0.35, o: 0.5 },
  { cx: 0.52, cy: 0.22, r: 0.4, o: 0.6 },
  { cx: 0.82, cy: 0.22, r: 0.35, o: 0.5 },
];

export function GradientBackground({
  children,
  variant = 'sunset',
  stars,
  sun,
  style,
}: GradientBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const stops = gradients[variant];
  // Default hero decorations: a soft sun for daylight sunset / dawn; stars for
  // night & dusk. Consumers may override either flag explicitly.
  const showSun = sun ?? (variant === 'sunset' || variant === 'dawn');
  const showStars = stars ?? (variant === 'night' || variant === 'dusk');
  const sunCx = width * 0.5;
  const sunCy = height * 0.26;
  const sunRadius = Math.min(width, height) * 0.14;

  return (
    <View style={[styles.container, style]}>
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            {stops.map((color, i) => (
              <Stop
                key={color}
                offset={`${(i / (stops.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </LinearGradient>
          <RadialGradient
            id="sunGlow"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor="#FFF3C4" stopOpacity="1" />
            <Stop offset="55%" stopColor="#FFD6A5" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#FFB4B4" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#bg)" />
        {showSun ? (
          <>
            {/* Outer warm halo — soft, diffuse. */}
            <Circle
              cx={sunCx}
              cy={sunCy}
              r={sunRadius * 2.6}
              fill="url(#sunGlow)"
              opacity={0.9}
            />
            {/* The sun disc itself — pale gold. */}
            <Circle
              cx={sunCx}
              cy={sunCy}
              r={sunRadius}
              fill="#FFF2C2"
              opacity={0.95}
            />
          </>
        ) : null}
        {showStars
          ? STAR_FIELD.map((s, i) => (
              <Circle
                key={i}
                cx={s.cx * width}
                cy={s.cy * height}
                r={s.r}
                fill="#FFFFFF"
                opacity={s.o}
              />
            ))
          : null}
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
