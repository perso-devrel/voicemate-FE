import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { PhotoBackground } from '@/components/ui/PhotoBackground';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { calculateAge } from '@/utils/age';

const BIO_AUDIO_POLL_INTERVAL_MS = 3000;
const BIO_AUDIO_POLL_TIMEOUT_MS = 60_000;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, uploadPhoto, deletePhoto, replacePhoto, loadProfile } = useProfile();
  const logout = useAuthStore((s) => s.logout);

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
    const uri = await pickAndValidate();
    if (!uri) return;
    try {
      await uploadPhoto(uri);
    } catch (e: any) {
      Alert.alert(t('profile.uploadFailed'), e.message);
    }
  };

  const handleChangePhoto = async () => {
    const uri = await pickAndValidate();
    if (!uri) return;
    try {
      await replacePhoto(uri);
    } catch (e: any) {
      Alert.alert(t('profile.uploadFailed'), e.message);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert(t('profile.deletePhoto'), t('profile.removePhotoConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePhoto(0) },
    ]);
  };

  const handlePhotoPress = () => {
    Alert.alert(t('profile.photoActionsTitle'), undefined, [
      { text: t('profile.changePhoto'), onPress: handleChangePhoto },
      { text: t('common.delete'), style: 'destructive', onPress: handleDeletePhoto },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
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
      {/* Profile Photo (single) */}
      {profile.photos[0] ? (
        <Pressable key="photo-tile" style={styles.photoSlot} onPress={handlePhotoPress}>
          <Image
            key={profile.photos[0]}
            source={{ uri: profile.photos[0] }}
            style={styles.photo}
            resizeMode="cover"
          />
        </Pressable>
      ) : (
        <Pressable key="add-tile" style={[styles.photoSlot, styles.addPhoto]} onPress={handleAddPhoto}>
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
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {profile.bio_audio_url ? (
          <AudioPlayer url={profile.bio_audio_url} />
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
        <Button
          title={t('profile.editProfile')}
          variant="outline"
          onPress={() => router.push('/(main)/setup/profile')}
        />
        <Button
          title={t('profile.voiceSettings')}
          variant="outline"
          onPress={() => router.push('/(main)/setup/voice')}
        />
        <Button
          title={t('profile.matchingPreferences')}
          variant="outline"
          onPress={() => router.push('/(main)/settings/preferences')}
        />
        <Button
          title={t('profile.blockedUsers')}
          variant="outline"
          onPress={() => router.push('/(main)/settings/blocked')}
        />
        <Button
          title={t('common.logout')}
          variant="danger"
          onPress={handleLogout}
        />
      </View>
      </ScrollView>
    </PhotoBackground>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_WIDTH = SCREEN_WIDTH - 32; // matches contentContainerStyle padding (16 * 2)
const PHOTO_HEIGHT = (PHOTO_WIDTH * 4) / 3; // 3:4 portrait

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  photoSlot: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
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
    fontSize: 28,
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
  bio: {
    fontSize: 14,
    color: colors.text,
    marginTop: 12,
    lineHeight: 22,
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
});
