import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { useProfile, MAX_PHOTOS } from '@/hooks/useProfile';
import { usePreferences } from '@/hooks/usePreferences';
import * as profileService from '@/services/profile';
import { useSignupDraftStore } from '@/stores/signupDraftStore';
import { colors, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

// Layout constants mirror (tabs)/profile.tsx so the registered photo grid
// looks identical to what the user will see on their public profile.
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_WIDTH = SCREEN_WIDTH - 40; // matches setup contentContainer padding (20 * 2)
const GRID_GAP = 10;
const THUMB_COUNT = 3; // three thumbnails stacked vertically beside the main photo
const MAIN_PHOTO_WIDTH = Math.round(GRID_WIDTH * (2 / 3));
const MAIN_PHOTO_HEIGHT = Math.round((MAIN_PHOTO_WIDTH * 4) / 3); // 3:4 portrait
const THUMB_WIDTH = GRID_WIDTH - MAIN_PHOTO_WIDTH - GRID_GAP;
const THUMB_HEIGHT = Math.round((MAIN_PHOTO_HEIGHT - GRID_GAP * (THUMB_COUNT - 1)) / THUMB_COUNT);

export default function SetupStep5() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useSignupDraftStore();
  const { upsertProfile, loadProfile, loading: profileLoading } = useProfile();
  const { updatePreferences, loading: prefLoading } = usePreferences();

  const [photoUris, setPhotoUris] = useState<string[]>(draft.photoUris);
  const [submitting, setSubmitting] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const closeSheet = () => setActivePhotoIndex(null);

  const pickAndValidate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (asset.mimeType && !allowed.includes(asset.mimeType)) {
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

  const handleAdd = async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      Alert.alert(t('profile.photoActionsTitle'), t('profile.maxPhotosReached'));
      return;
    }
    const uri = await pickAndValidate();
    if (!uri) return;
    const next = [...photoUris, uri];
    setPhotoUris(next);
    draft.setPhotoUris(next);
  };

  const handleSetMain = (index: number) => {
    if (index <= 0 || index >= photoUris.length) return;
    const next = [photoUris[index], ...photoUris.filter((_, i) => i !== index)];
    setPhotoUris(next);
    draft.setPhotoUris(next);
  };

  const handleEditPhoto = async (index: number) => {
    const uri = await pickAndValidate();
    if (!uri) return;
    const next = photoUris.map((u, i) => (i === index ? uri : u));
    setPhotoUris(next);
    draft.setPhotoUris(next);
  };

  const handleRemove = (index: number) => {
    Alert.alert(t('profile.deletePhoto'), t('profile.removePhotoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          const next = photoUris.filter((_, i) => i !== index);
          setPhotoUris(next);
          draft.setPhotoUris(next);
        },
      },
    ]);
  };

  const runSheetAction = (action: (index: number) => void | Promise<void>) => {
    const index = activePhotoIndex;
    closeSheet();
    if (index === null) return;
    action(index);
  };

  const handleRegister = async () => {
    if (photoUris.length === 0) {
      Alert.alert(t('common.error'), t('signupWizard.step5AtLeastOne'));
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await upsertProfile(draft.buildProfilePayload());
      for (const uri of photoUris) {
        await profileService.uploadPhoto(uri);
      }
      if (draft.preferences) {
        try {
          await updatePreferences(draft.preferences);
        } catch {
          // Prefs are secondary — don't fail signup if this fails.
        }
      }
      await loadProfile();
      draft.reset();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(main)/(tabs)/discover');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('signupWizard.registerFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = submitting || profileLoading || prefLoading;
  const canProceed = photoUris.length >= 1;
  const mainUri = photoUris[0];

  return (
    <View style={styles.container}>
      <WizardHeader
        step={5}
        title={t('signupWizard.step5Title')}
        subtitle={t('signupWizard.step5Subtitle')}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      >
        {/* Photo grid layout matches (tabs)/profile.tsx so what the user
            registers here is what they'll see on their profile tab. Always
            render every slot so empty inputs are visible from the start. */}
        <View style={styles.photoGrid}>
          {mainUri ? (
            <Pressable
              key="main-photo"
              style={styles.mainPhotoSlot}
              onPress={() => setActivePhotoIndex(0)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.photoActionsTitle')}
            >
              <Image source={{ uri: mainUri }} style={styles.photo} resizeMode="cover" />
              <View style={styles.mainBadge}>
                <Ionicons name="star" size={12} color={colors.white} />
              </View>
            </Pressable>
          ) : (
            <Pressable
              key="main-add"
              style={[styles.mainPhotoSlot, styles.addSlot]}
              onPress={handleAdd}
              accessibilityRole="button"
              accessibilityLabel={t('profile.addPhoto')}
            >
              <Ionicons name="add" size={36} color={colors.textSecondary} />
            </Pressable>
          )}

          <View style={styles.thumbColumn}>
            {Array.from({ length: THUMB_COUNT }).map((_, i) => {
              const photoIndex = i + 1;
              const uri = photoUris[photoIndex];
              if (uri) {
                return (
                  <Pressable
                    key={`thumb-${photoIndex}`}
                    style={styles.thumbSlot}
                    onPress={() => setActivePhotoIndex(photoIndex)}
                    accessibilityRole="button"
                    accessibilityLabel={t('profile.photoActionsTitle')}
                  >
                    <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={`thumb-add-${photoIndex}`}
                  style={[styles.thumbSlot, styles.addSlot]}
                  onPress={handleAdd}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.addPhoto')}
                >
                  <Ionicons name="add" size={24} color={colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {!canProceed && (
          <View style={styles.warnBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.warnText}>{t('signupWizard.step5AtLeastOne')}</Text>
          </View>
        )}

        <Button
          title={t('signupWizard.register')}
          onPress={handleRegister}
          loading={loading}
          disabled={!canProceed || loading}
          style={{ marginTop: 24 }}
        />

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Photo action sheet mirrors the one in (tabs)/profile.tsx so users
          re-encountering this on the profile tab see identical affordances. */}
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
                onPress={() => runSheetAction(handleRemove)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  photoGrid: {
    flexDirection: 'row',
    gap: GRID_GAP,
    width: GRID_WIDTH,
  },
  mainPhotoSlot: {
    width: MAIN_PHOTO_WIDTH,
    height: MAIN_PHOTO_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.cardAlt,
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
    backgroundColor: colors.cardAlt,
    ...shadows.soft,
  },
  addSlot: {
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photo: { width: '100%', height: '100%' },
  warnBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
  },
  loadingOverlay: {
    marginTop: 12,
    alignItems: 'center',
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
