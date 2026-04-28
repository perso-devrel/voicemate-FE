import { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { PhotoBackground } from '@/components/ui/PhotoBackground';
import { useProfile, MAX_PHOTOS } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { calculateAge } from '@/utils/age';

const BIO_AUDIO_POLL_INTERVAL_MS = 3000;
const BIO_AUDIO_POLL_TIMEOUT_MS = 60_000;

function MenuCardButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuShell, pressed && styles.menuPressed]}
    >
      <LinearGradient
        colors={[...gradients.blush]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.menuInner}
      >
        <Text style={styles.menuText}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </LinearGradient>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const {
    profile,
    loading: photoBusy,
    uploadPhoto,
    deletePhoto,
    setPrimaryPhoto,
    replacePhotoAt,
    loadProfile,
  } = useProfile();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/(main)/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.title')}
          hitSlop={12}
          style={({ pressed }) => [styles.headerGear, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, t]);

  // BE generates bio audio asynchronously (fire-and-forget TTS). When bio is
  // present but bio_audio_url is still null, poll for the URL to appear so
  // the play button shows up without requiring a manual reload.
  const bioSet = Boolean(profile?.bio && profile.bio.trim().length > 0);
  const audioReady = Boolean(profile?.bio_audio_url);
  const [synthesizing, setSynthesizing] = useState(false);
  useEffect(() => {
    if (!bioSet || audioReady) {
      setSynthesizing(false);
      return;
    }
    setSynthesizing(true);
    const interval = setInterval(() => {
      loadProfile();
    }, BIO_AUDIO_POLL_INTERVAL_MS);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setSynthesizing(false);
    }, BIO_AUDIO_POLL_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [bioSet, audioReady, loadProfile]);

  const pickAndValidate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (asset.mimeType && !allowedTypes.includes(asset.mimeType)) {
      Alert.alert(t('profile.invalidFormat'), t('profile.invalidImageFormat'));
      return null;
    }
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (info.exists && info.size && info.size > 5 * 1024 * 1024) {
      Alert.alert(t('profile.fileTooLarge'), t('profile.photoSizeLimit'));
      return null;
    }
    return asset.uri;
  };

  const handleAddPhoto = async () => {
    if ((profile?.photos.length ?? 0) >= MAX_PHOTOS) {
      Alert.alert(t('profile.photoActionsTitle'), t('profile.maxPhotosReached'));
      return;
    }
    const uri = await pickAndValidate();
    if (!uri) return;
    try {
      await uploadPhoto(uri);
    } catch (e: any) {
      Alert.alert(t('profile.uploadFailed'), e.message);
    }
  };

  const handleSetMain = async (index: number) => {
    try {
      await setPrimaryPhoto(index);
    } catch (e: any) {
      Alert.alert(t('profile.uploadFailed'), e.message);
    }
  };

  const handleEditPhoto = async (index: number) => {
    const uri = await pickAndValidate();
    if (!uri) return;
    try {
      await replacePhotoAt(index, uri);
    } catch (e: any) {
      Alert.alert(t('profile.uploadFailed'), e.message);
    }
  };

  const handleDeletePhotoAt = (index: number) => {
    Alert.alert(t('profile.deletePhoto'), t('profile.removePhotoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(index);
          } catch (e: any) {
            Alert.alert(t('profile.uploadFailed'), e.message);
          }
        },
      },
    ]);
  };

  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const closeSheet = () => setActivePhotoIndex(null);
  const handlePhotoPress = (index: number) => setActivePhotoIndex(index);

  const runSheetAction = (action: (index: number) => void | Promise<void>) => {
    const index = activePhotoIndex;
    closeSheet();
    if (index === null) return;
    action(index);
  };

  if (!profile) {
    return (
      <PhotoBackground variant="app">
        <View style={styles.center}>
          <Text>{t('profile.loadingProfile')}</Text>
        </View>
      </PhotoBackground>
    );
  }

  return (
    <PhotoBackground variant="app">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Photos: main on left, thumbnails stacked on right */}
      {profile.photos.length === 0 ? (
        <Pressable key="add-tile" style={[styles.mainPhoto, styles.addPhoto]} onPress={handleAddPhoto}>
          <LinearGradient
            colors={[...gradients.glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addIcon}
          >
            <Ionicons name="add" size={32} color={colors.white} />
          </LinearGradient>
          <Text style={styles.addPhotoLabel}>{t('profile.addPhoto')}</Text>
        </Pressable>
      ) : (
        <View style={styles.photoGrid}>
          <Pressable
            style={styles.mainPhotoSlot}
            onPress={() => handlePhotoPress(0)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.photoActionsTitle')}
          >
            <Image
              key={profile.photos[0]}
              source={{ uri: profile.photos[0] }}
              style={styles.photo}
              resizeMode="cover"
            />
            <View style={styles.mainBadge}>
              <Ionicons name="star" size={12} color={colors.white} />
            </View>
          </Pressable>

          <View style={styles.thumbColumn}>
            {Array.from({ length: THUMB_COUNT }).map((_, i) => {
              const photoIndex = i + 1;
              const uri = profile.photos[photoIndex];
              if (uri) {
                return (
                  <Pressable
                    key={`thumb-${photoIndex}`}
                    style={styles.thumbSlot}
                    onPress={() => handlePhotoPress(photoIndex)}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.photoActionsTitle')}
                  >
                    <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                  </Pressable>
                );
              }
              if (profile.photos.length + 1 > photoIndex && profile.photos.length < MAX_PHOTOS) {
                return (
                  <Pressable
                    key={`thumb-add-${photoIndex}`}
                    style={[styles.thumbSlot, styles.addThumb]}
                    onPress={handleAddPhoto}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.addPhoto')}
                  >
                    <Ionicons name="add" size={24} color={colors.textSecondary} />
                  </Pressable>
                );
              }
              return <View key={`thumb-empty-${photoIndex}`} style={[styles.thumbSlot, styles.emptyThumb]} />;
            })}
          </View>
        </View>
      )}

      {photoBusy && (
        <View style={styles.photoBusyOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.photoBusyText}>{t('profile.reorderingPhotos')}</Text>
        </View>
      )}

      {/* Profile Info */}
      <LinearGradient
        colors={[...gradients.blush]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.section}
      >
        <Text style={styles.name}>
          {profile.display_name}, {calculateAge(profile.birth_date)}
        </Text>
        <Text style={styles.detail}>
          {profile.nationality} / {profile.language}
        </Text>
        <Pressable
          style={styles.bioRow}
          onPress={() => router.push('/(main)/settings/edit-bio')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.editBio')}
        >
          <Text
            style={[styles.bio, !profile.bio && styles.bioEmpty]}
            numberOfLines={0}
          >
            {profile.bio || t('profile.bioEmpty')}
          </Text>
          <Ionicons name="pencil" size={16} color={colors.primaryDark} style={styles.bioPencil} />
        </Pressable>

        {profile.bio_audio_url ? (
          // Re-key on URL so saving a new bio mounts a fresh player instance
          // — expo-audio's useAudioPlayer captures source at first render and
          // wouldn't reload a changed prop, so the previous bio's audio would
          // keep playing despite a new bio_audio_url.
          <AudioPlayer key={profile.bio_audio_url} url={profile.bio_audio_url} />
        ) : synthesizing ? (
          <View style={styles.synthesizing}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.synthesizingText}>
              {t('profile.synthesizingBio')}
            </Text>
          </View>
        ) : null}

        {profile.interests.length > 0 && (
          <View style={styles.tags}>
            {profile.interests.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Voice Clone CTA (only when not yet registered) */}
      {profile.voice_clone_status === 'pending' && (
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.voiceCtaBox}
        >
          <Ionicons name="mic-outline" size={18} color={colors.white} />
          <Text style={styles.voiceCtaText}>{t('profile.registerVoicePrompt')}</Text>
        </LinearGradient>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <MenuCardButton
          label={t('profile.editProfile')}
          onPress={() => router.push('/(main)/settings/edit-profile')}
        />
        <MenuCardButton
          label={t('profile.interestsSettings')}
          onPress={() => router.push('/(main)/settings/edit-interests')}
        />
        <MenuCardButton
          label={t('profile.matchingPreferences')}
          onPress={() => router.push('/(main)/settings/preferences')}
        />
      </View>
      </ScrollView>

      <Modal
        visible={activePhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
          <Pressable style={styles.sheetGroup} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheet}>
              {activePhotoIndex !== null && activePhotoIndex !== 0 && (
                <Pressable
                  style={({ pressed }) => [styles.sheetBtn, pressed && styles.sheetBtnPressed]}
                  onPress={() => runSheetAction(handleSetMain)}
                >
                  <Text style={styles.sheetBtnText}>{t('profile.setAsMain')}</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnBordered, pressed && styles.sheetBtnPressed]}
                onPress={() => runSheetAction(handleEditPhoto)}
              >
                <Text style={styles.sheetBtnText}>{t('profile.editPhoto')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnBordered, pressed && styles.sheetBtnPressed]}
                onPress={() => runSheetAction(handleDeletePhotoAt)}
              >
                <Text style={[styles.sheetBtnText, styles.sheetBtnDestructive]}>
                  {t('common.delete')}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.sheet, styles.sheetCancel, pressed && styles.sheetBtnPressed]}
              onPress={closeSheet}
            >
              <Text style={[styles.sheetBtnText, styles.sheetBtnCancelText]}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </PhotoBackground>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_WIDTH = SCREEN_WIDTH - 32; // matches contentContainerStyle padding (16 * 2)
const GRID_GAP = 10;
const THUMB_COUNT = 3; // three thumbnails stacked vertically beside the main photo
const MAIN_PHOTO_WIDTH = Math.round(GRID_WIDTH * (2 / 3));
const MAIN_PHOTO_HEIGHT = Math.round((MAIN_PHOTO_WIDTH * 4) / 3); // 3:4 portrait
const THUMB_WIDTH = GRID_WIDTH - MAIN_PHOTO_WIDTH - GRID_GAP;
const THUMB_HEIGHT = Math.round((MAIN_PHOTO_HEIGHT - GRID_GAP * (THUMB_COUNT - 1)) / THUMB_COUNT);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerGear: {
    marginRight: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: GRID_GAP,
    width: GRID_WIDTH,
  },
  mainPhoto: {
    width: GRID_WIDTH,
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  mainPhotoSlot: {
    width: MAIN_PHOTO_WIDTH,
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  mainBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  thumbColumn: {
    width: THUMB_WIDTH,
    height: MAIN_PHOTO_HEIGHT,
    gap: GRID_GAP,
  },
  thumbSlot: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.soft,
  },
  addThumb: {
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyThumb: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addPhoto: {
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 14,
  },
  photoBusyOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.soft,
  },
  photoBusyText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
  },
  addIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  section: {
    marginTop: 22,
    padding: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.soft,
  },
  voiceCtaBox: {
    marginTop: 18,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.glow,
  },
  voiceCtaText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  detail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.white,
  },
  bio: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  bioEmpty: {
    color: colors.textLight,
    fontStyle: 'italic',
  },
  bioPencil: {
    marginTop: 3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  tag: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
  },
  actions: {
    marginTop: 28,
    gap: 10,
  },
  menuShell: {
    borderRadius: radii.lg,
    ...shadows.soft,
  },
  menuInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  menuText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  menuPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  synthesizing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  synthesizingText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheetGroup: {
    gap: 10,
  },
  sheet: {
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadows.card,
  },
  sheetBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnBordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  sheetBtnPressed: {
    backgroundColor: colors.cardAlt,
  },
  sheetBtnText: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  sheetBtnDestructive: {
    color: colors.primary,
  },
  sheetCancel: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnCancelText: {
    fontFamily: fonts.bold,
  },
});
