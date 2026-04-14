import { useCallback, useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface AudioPlayerProps {
  url: string;
  compact?: boolean;
}

export function AudioPlayer({ url, compact = false }: AudioPlayerProps) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status.playing;

  useEffect(() => {
    return () => {
      player.remove();
    };
  }, [player]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  }, [player, isPlaying]);

  return (
    <Pressable onPress={toggle} style={[styles.container, compact && styles.compact]}>
      <Ionicons
        name={isPlaying ? 'stop-circle' : 'play-circle'}
        size={compact ? 24 : 32}
        color={colors.primary}
      />
      {!compact && (
        <Text style={styles.label}>{isPlaying ? 'Stop' : 'Play'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
});
