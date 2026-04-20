import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { calculateAge } from '@/utils/age';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, uploadPhoto, deletePhoto, replacePhoto } = useProfile();
  const logout = useAuthStore((s) => s.logout);

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
      <View style={styles.center}>
        <Text>{t('profile.loadingProfile')}</Text>
      </View>
    );
  }

  return (
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
          <Ionicons name="add" size={48} color={colors.textLight} />
          <Text style={styles.addPhotoLabel}>{t('profile.addPhoto')}</Text>
        </Pressable>
      )}

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.name}>
          {profile.display_name}, {calculateAge(profile.birth_date)}
        </Text>
        <Text style={styles.detail}>
          {profile.nationality} / {profile.language}
        </Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {profile.bio_audio_url && (
          <AudioPlayer url={profile.bio_audio_url} />
        )}

        {profile.interests.length > 0 && (
          <View style={styles.tags}>
            {profile.interests.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Voice Clone CTA (only when not yet registered) */}
      {profile.voice_clone_status === 'pending' && (
        <View style={styles.voiceCtaBox}>
          <Text style={styles.voiceCtaText}>{t('profile.registerVoicePrompt')}</Text>
        </View>
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
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_WIDTH = SCREEN_WIDTH - 32; // matches contentContainerStyle padding (16 * 2)
const PHOTO_HEIGHT = (PHOTO_WIDTH * 4) / 3; // 3:4 portrait

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addPhoto: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPhotoLabel: {
    fontSize: 14,
    color: colors.textLight,
  },
  section: {
    marginTop: 20,
  },
  voiceCtaBox: {
    marginTop: 20,
    backgroundColor: '#FFE4EC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  voiceCtaText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: '#D63384',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  detail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 13,
    color: colors.white,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
});
