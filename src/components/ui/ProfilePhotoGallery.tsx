import { useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { usePhotoAccess } from '@/hooks/usePhotoAccess';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

// Matches DETAIL_BLUR in ProfilePhoto so a locked main photo reads the same
// whether it's rendered here or via <ProfilePhoto variant="detail" />.
const DETAIL_BLUR = 40;

interface ProfilePhotoGalleryProps {
  // Registry key for photo-access lookup.
  userId: string;
  // Full photos array as returned by BE. photos[0] is the main photo.
  photos: string[];
}

// Horizontal-paging photo carousel used in the chat-screen partner modal.
// photos[0] is the first slide (main photo), and additional photos become
// reachable by swiping sideways only once `all_photos_unlocked` flips true
// (10 round-trip unlock). With a single photo or while still locked, paging
// is disabled so the card feels static — no phantom slides to swipe to.
export function ProfilePhotoGallery({ userId, photos }: ProfilePhotoGalleryProps) {
  const { t } = useTranslation();
  const access = usePhotoAccess(userId);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return null;
  }

  const mainBlurred = !access.main_photo_unlocked;
  const canSwipe = access.all_photos_unlocked && photos.length > 1;
  const visiblePhotos = canSwipe ? photos : [photos[0]];

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== width) setWidth(w);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const blurred = index === 0 && mainBlurred;
    return (
      <View style={[styles.slide, { width }]}>
        <Image
          source={{ uri: item }}
          style={styles.photo}
          resizeMode="cover"
          blurRadius={blurred ? DETAIL_BLUR : 0}
        />
        {blurred ? (
          <View style={styles.lockRow} pointerEvents="none">
            <Ionicons name="lock-closed" size={14} color={colors.white} />
            <Text style={styles.lockText} numberOfLines={1}>
              {t('photoAccess.locked.hint')}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View onLayout={onLayout} style={styles.container}>
      {width > 0 ? (
        <FlatList
          data={visiblePhotos}
          horizontal
          pagingEnabled
          scrollEnabled={canSwipe}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          renderItem={renderItem}
        />
      ) : null}
      {canSwipe ? (
        <View style={styles.dots} pointerEvents="none">
          {visiblePhotos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: colors.cardAlt,
  },
  slide: {
    height: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  lockRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  lockText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.white,
  },
});
