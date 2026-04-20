import { View, Text, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { calculateAge } from '@/utils/age';
import type { DiscoverCandidate } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = CARD_WIDTH * 1.35;
const FADE_HEIGHT = 260;

interface SwipeCardProps {
  candidate: DiscoverCandidate;
  onLike: () => void;
  onPass: () => void;
}

export function SwipeCard({ candidate, onLike, onPass }: SwipeCardProps) {
  const age = calculateAge(candidate.birth_date);
  const photo = candidate.photos[0];

  return (
    <View style={styles.card}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="person" size={80} color={colors.white} />
        </View>
      )}

      {/* Sunset fade: warm rose glow climbing from the bottom. */}
      <Svg
        width={CARD_WIDTH}
        height={FADE_HEIGHT}
        style={styles.fade}
        pointerEvents="none"
      >
        <Defs>
          <SvgLinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3D2347" stopOpacity="0" />
            <Stop offset="45%" stopColor="#6B3D5F" stopOpacity="0.32" />
            <Stop offset="80%" stopColor="#3D2347" stopOpacity="0.72" />
            <Stop offset="100%" stopColor="#2B1832" stopOpacity="0.9" />
          </SvgLinearGradient>
        </Defs>
        <Rect width={CARD_WIDTH} height={FADE_HEIGHT} fill="url(#fade)" />
      </Svg>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {candidate.display_name}, {age}
          </Text>
          {candidate.bio_audio_url && (
            <View style={styles.audioWrap}>
              <AudioPlayer
                url={candidate.bio_audio_url}
                compact
                tintColor={colors.white}
              />
            </View>
          )}
        </View>
        <Text style={styles.detail}>
          {candidate.nationality} · {candidate.language}
        </Text>
        {candidate.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {candidate.bio}
          </Text>
        )}
        {candidate.interests.length > 0 && (
          <View style={styles.interests}>
            {candidate.interests.slice(0, 4).map((interest, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.passBtn, pressed && styles.actionPressed]}
          onPress={onPass}
          accessibilityLabel="pass"
        >
          <Ionicons name="close" size={30} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={onLike}
          accessibilityLabel="like"
          style={({ pressed }) => [styles.likeShell, pressed && styles.actionPressed]}
        >
          <LinearGradient
            colors={[...gradients.glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.actionBtn, styles.likeBtn]}
          >
            <Ionicons name="heart" size={30} color={colors.white} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 80,
  },
  info: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 104,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  audioWrap: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radii.pill,
    paddingHorizontal: 4,
  },
  detail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    letterSpacing: 0.3,
    fontFamily: fonts.medium,
  },
  bio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 8,
    lineHeight: 19,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  tagText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: fonts.medium,
  },
  actions: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  likeShell: {
    borderRadius: 32,
    overflow: 'hidden',
    ...shadows.glow,
  },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passBtn: {
    backgroundColor: colors.card,
    ...shadows.card,
  },
  likeBtn: {
    // gradient fill applied by wrapping LinearGradient.
  },
  actionPressed: {
    transform: [{ scale: 0.92 }],
  },
});
