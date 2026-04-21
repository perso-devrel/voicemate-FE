import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { useProfile } from '@/hooks/useProfile';
import { colors, radii } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

export default function EditBioScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, loading, upsertProfile } = useProfile();
  const voiceReady = profile?.voice_clone_status === 'ready';

  const [bio, setBio] = useState(profile?.bio ?? '');
  const [kbHeight, setKbHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (profile) setBio(profile.bio ?? '');
  }, [profile]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    try {
      await upsertProfile({
        display_name: profile.display_name,
        birth_date: profile.birth_date,
        gender: profile.gender,
        nationality: profile.nationality,
        language: profile.language,
        bio: bio.trim() ? bio.trim() : null,
        interests: profile.interests,
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={1}
        total={1}
        title={t('profile.editBio')}
        subtitle={t('profile.editBioSubtitle')}
        onBack={() => router.back()}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + Math.max(kbHeight, insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={t('setupProfile.bio')}
          value={bio}
          onChangeText={setBio}
          placeholder={
            voiceReady ? t('setupProfile.bioPlaceholder') : t('setupProfile.bioLockedPlaceholder')
          }
          multiline
          maxLength={500}
          editable={voiceReady}
          style={[
            { height: 160, textAlignVertical: 'top' as const },
            !voiceReady && styles.bioDisabled,
          ]}
        />

        {!voiceReady && (
          <View style={styles.bioLockBox}>
            <Ionicons name="mic-off-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.bioLockText}>{t('setupProfile.bioLockedHint')}</Text>
          </View>
        )}

        <Button
          title={t('common.save')}
          onPress={handleSave}
          loading={loading}
          disabled={!voiceReady}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  bioDisabled: { backgroundColor: colors.surface, color: colors.textLight, opacity: 0.7 },
  bioLockBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
  },
  bioLockText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
  },
});
