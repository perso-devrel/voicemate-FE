import { useCallback, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { calculateAge } from '@/utils/age';
import type { DiscoverCandidate } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const COVER_SIZE = Math.round((CARD_WIDTH - 40) * 0.8);

const WAVE_BAR_COUNT = 36;
const WAVE_BAR_WIDTH = 3;
const WAVE_MAX_HEIGHT = 28;
const WAVE_MIN_HEIGHT = 4;

// Cheap deterministic PRNG so every candidate gets a distinct waveform
// silhouette that does not jitter between re-renders.
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildWaveform(seed: string): number[] {
  const rand = mulberry32(hashSeed(seed));
  return Array.from({ length: WAVE_BAR_COUNT }, (_, i) => {
    // Sine envelope quiets the ends so the shape reads as a single utterance
    // instead of a flat rectangle of noise.
    const envelope = Math.sin((Math.PI * (i + 0.5)) / WAVE_BAR_COUNT);
    const raw = WAVE_MIN_HEIGHT + rand() * (WAVE_MAX_HEIGHT - WAVE_MIN_HEIGHT);
    return Math.max(WAVE_MIN_HEIGHT, Math.round(raw * (0.4 + 0.6 * envelope)));
  });
}

interface SwipeCardProps {
  candidate: DiscoverCandidate;
  onLike: () => void;
  onPass: () => void;
}

export function SwipeCard({ candidate, onLike, onPass }: SwipeCardProps) {
  const age = calculateAge(candidate.birth_date);
  const photo = candidate.photos[0];
  const audioUrl = candidate.bio_audio_url;

  const player = useAudioPlayer(audioUrl ?? undefined);
  const status = useAudioPlayerStatus(player);
  const isPlaying = audioUrl ? status.playing : false;
  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const waveform = useMemo(() => buildWaveform(candidate.id), [candidate.id]);

  const togglePlay = useCallback(() => {
    if (!audioUrl) return;
    if (isPlaying) {
      player.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration) {
      player.seekTo(0);
    }
    player.play();
  }, [audioUrl, player, isPlaying, duration, currentTime]);

  return (
    <View style={styles.card}>
      <View style={styles.cover}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.placeholder]}>
            <Ionicons name="person" size={80} color={colors.white} />
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {candidate.display_name}, {age}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {candidate.nationality} · {candidate.language}
        </Text>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.waveform}>
          {waveform.map((h, i) => {
            const played = (i + 0.5) / WAVE_BAR_COUNT <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor: played
                      ? colors.primary
                      : 'rgba(255,255,255,0.28)',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={onPass}
          accessibilityLabel="pass"
          style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        >
          <Ionicons name="play-skip-back" size={28} color={colors.white} />
        </Pressable>

        <Pressable
          onPress={togglePlay}
          disabled={!audioUrl}
          accessibilityLabel="play-bio"
          style={({ pressed }) => [styles.playShell, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.playBtn, !audioUrl && styles.playBtnDisabled]}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={30}
              color={colors.white}
              style={isPlaying ? undefined : styles.playIconOffset}
            />
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={onLike}
          accessibilityLabel="like"
          style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        >
          <Ionicons name="play-skip-forward" size={28} color={colors.like} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(20,10,25,0.55)',
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    ...shadows.soft,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meta: {
    marginTop: 14,
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  detail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    fontFamily: fonts.medium,
    letterSpacing: 0.3,
  },
  progressWrap: {
    width: '100%',
    paddingHorizontal: 6,
    marginTop: 14,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: WAVE_MAX_HEIGHT,
  },
  waveBar: {
    width: WAVE_BAR_WIDTH,
    borderRadius: WAVE_BAR_WIDTH / 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    marginTop: 14,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playShell: {
    borderRadius: 36,
    ...shadows.glow,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnDisabled: {
    opacity: 0.5,
  },
  playIconOffset: {
    marginLeft: 3,
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
});
