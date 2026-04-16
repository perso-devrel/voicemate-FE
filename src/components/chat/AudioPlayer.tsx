import { useCallback } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/colors';

interface AudioPlayerProps {
  url: string;
  compact?: boolean;
  showProgressBar?: boolean;
}

export function AudioPlayer({ url, compact = false, showProgressBar = false }: AudioPlayerProps) {
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

  return (
    <Pressable onPress={toggle} style={[styles.container, compact && styles.compact]}>
      <Ionicons
        name={isPlaying ? 'pause-circle' : 'play-circle'}
        size={compact ? 24 : 32}
        color={colors.primary}
      />
      {showProgressBar ? (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      ) : (
        !compact && (
          <Text style={styles.label}>{isPlaying ? t('audioPlayer.stop') : t('audioPlayer.play')}</Text>
        )
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
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
