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

export default function SetupStep5() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const draft = useSignupDraftStore();
  const { upsertProfile, loading: profileLoading } = useProfile();
  const { updatePreferences, loading: prefLoading } = usePreferences();

  const [photoUris, setPhotoUris] = useState<string[]>(draft.photoUris);
  const [submitting, setSubmitting] = useState(false);

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

  const handleRemove = (index: number) => {
    const next = photoUris.filter((_, i) => i !== index);
    setPhotoUris(next);
    draft.setPhotoUris(next);
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
      draft.reset();
      router.replace('/(main)/(tabs)/discover');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message ?? t('signupWizard.registerFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const loading = submitting || profileLoading || prefLoading;
  const canProceed = photoUris.length >= 1;

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
        <View style={styles.grid}>
          {photoUris.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.tile}>
              <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
              {i === 0 && (
                <View style={styles.mainBadge}>
                  <Ionicons name="star" size={12} color={colors.white} />
                </View>
              )}
              <Pressable
                style={styles.removeBtn}
                onPress={() => handleRemove(i)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.deletePhoto')}
              >
                <Ionicons name="close" size={16} color={colors.white} />
              </Pressable>
            </View>
          ))}

          {photoUris.length < MAX_PHOTOS && (
            <Pressable style={[styles.tile, styles.addTile]} onPress={handleAdd}>
              <Ionicons name="add" size={32} color={colors.textSecondary} />
              <Text style={styles.addLabel}>{t('profile.addPhoto')}</Text>
            </Pressable>
          )}
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
    </View>
  );
}

const TILE_SIZE = 104;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    width: TILE_SIZE,
    height: Math.round(TILE_SIZE * 4 / 3),
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.cardAlt,
    ...shadows.soft,
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  photo: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginTop: 8,
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
});
