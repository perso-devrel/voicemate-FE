import { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { BioPhrasePicker } from '@/components/setup/BioPhrasePicker';
import { useProfile } from '@/hooks/useProfile';
import { colors } from '@/constants/colors';

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
        <BioPhrasePicker
          value={bio}
          onChange={setBio}
          language={profile?.language ?? 'ko'}
          disabled={!voiceReady}
          lockedHint={!voiceReady ? t('setupProfile.bioLockedHint') : undefined}
        />

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
});
