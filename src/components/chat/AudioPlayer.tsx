import { useCallback } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/colors';

interface AudioPlayerProps {
  url: string;
  compact?: boolean;
  showProgressBar?: boolean;
  tintColor?: string;
}

const RING_SIZE = 56;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function AudioPlayer({ url, compact = false, showProgressBar = false, tintColor = colors.primary }: AudioPlayerProps) {
  const { t } = useTranslation();
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;
  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  const toggle = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      if (duration > 0 && currentTime >= duration) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [player, isPlaying, duration, currentTime]);

  if (showProgressBar) {
    return (
      <Pressable onPress={toggle} style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={tintColor}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={26}
          color={tintColor}
          style={isPlaying ? undefined : styles.playIconOffset}
        />
      </Pressable>
    );
  }

  return (
    <Pressable onPress={toggle} style={[styles.container, compact && styles.compact]}>
      <Ionicons
        name={isPlaying ? 'pause-circle' : 'play-circle'}
        size={compact ? 24 : 32}
        color={colors.primary}
      />
      {!compact && (
        <Text style={styles.label}>{isPlaying ? t('audioPlayer.stop') : t('audioPlayer.play')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
  },
  compact: {
    padding: 2,
  },
  label: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  playIconOffset: {
    marginLeft: 3, // optical centering for play triangle
  },
});
