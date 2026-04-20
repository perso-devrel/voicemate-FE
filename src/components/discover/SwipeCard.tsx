import { View, Text, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { calculateAge } from '@/utils/age';
import type { DiscoverCandidate } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

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
          <Ionicons name="person" size={80} color={colors.textLight} />
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.info}>
          <Text style={styles.name}>
            {candidate.display_name}, {age}
          </Text>
          <Text style={styles.detail}>
            {candidate.nationality} / {candidate.language}
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
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, styles.passBtn]} onPress={onPass}>
          <Ionicons name="close" size={32} color={colors.pass} />
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.likeBtn]} onPress={onLike}>
          <Ionicons name="heart" size={32} color={colors.like} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'transparent',
  },
  info: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 12,
  },
  name: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  detail: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.8,
    marginTop: 6,
  },
  interests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: colors.white,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  passBtn: {
    borderColor: colors.pass,
  },
  likeBtn: {
    borderColor: colors.like,
  },
});
