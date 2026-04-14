import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import { calculateAge } from '@/utils/age';

export default function ProfileScreen() {
  const { profile, loading, uploadPhoto, deletePhoto } = useProfile();
  const logout = useAuthStore((s) => s.logout);

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (asset.mimeType && !allowedTypes.includes(asset.mimeType)) {
        Alert.alert('Invalid Format', 'Only JPEG, PNG, and WebP images are allowed.');
        return;
      }
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (info.exists && info.size && info.size > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Photo must be under 5MB.');
        return;
      }
      try {
        await uploadPhoto(asset.uri);
      } catch (e: any) {
        Alert.alert('Upload Failed', e.message);
      }
    }
  };

  const handleDeletePhoto = (index: number) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePhoto(index) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
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
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photos */}
      <View style={styles.photosGrid}>
        {profile.photos.map((uri, i) => (
          <Pressable key={i} style={styles.photoSlot} onLongPress={() => handleDeletePhoto(i)}>
            <Image source={{ uri }} style={styles.photo} />
          </Pressable>
        ))}
        {profile.photos.length < 6 && (
          <Pressable style={[styles.photoSlot, styles.addPhoto]} onPress={handleAddPhoto}>
            <Ionicons name="add" size={32} color={colors.textLight} />
          </Pressable>
        )}
      </View>

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

      {/* Voice Clone Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Clone</Text>
        <Text style={styles.detail}>
          Status: {profile.voice_clone_status}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Edit Profile"
          variant="outline"
          onPress={() => router.push('/(main)/setup/profile')}
        />
        <Button
          title="Voice Settings"
          variant="outline"
          onPress={() => router.push('/(main)/setup/voice')}
        />
        <Button
          title="Matching Preferences"
          variant="outline"
          onPress={() => router.push('/(main)/settings/preferences')}
        />
        <Button
          title="Blocked Users"
          variant="outline"
          onPress={() => router.push('/(main)/settings/blocked')}
        />
        <Button
          title="Logout"
          variant="danger"
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
  );
}

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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addPhoto: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
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
