import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { useProfile } from '@/hooks/useProfile';
import { useVoice } from '@/hooks/useVoice';
import { useAuthStore } from '@/stores/authStore';
import { colors, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/constants/languages';
import { SUPPORTED_NATIONALITIES, type NationalityCode } from '@/constants/nationalities';
import type { ProfileUpsertRequest } from '@/types';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;
const RECORD_ORANGE = '#E8945F';
const MAX_DURATION_MS = 60_000;
const MIN_DURATION_MS = 10_000;
const RING_SIZE = 56;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const formatBirthDate = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

function RecordRing({
  isRecording,
  durationMs,
  onPress,
}: {
  isRecording: boolean;
  durationMs: number;
  onPress: () => void;
}) {
  const progress = isRecording ? Math.min(durationMs / MAX_DURATION_MS, 1) : 0;
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
      }}
    >
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={colors.border} strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={RECORD_ORANGE}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>
      <Ionicons name={isRecording ? 'stop' : 'mic'} size={26} color={RECORD_ORANGE} />
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, loading, upsertProfile } = useProfile();
  const { status, loading: voiceLoading, uploadClone, deleteClone, checkStatus } = useVoice();
  const authProfile = useAuthStore((s) => s.profile);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

  const [form, setForm] = useState<
    Pick<ProfileUpsertRequest, 'display_name' | 'birth_date' | 'gender' | 'nationality' | 'language'>
  >({
    display_name: profile?.display_name ?? '',
    birth_date: profile?.birth_date ?? '',
    gender: profile?.gender ?? 'male',
    nationality: profile?.nationality ?? '',
    language: profile?.language ?? '',
  });
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name,
        birth_date: profile.birth_date,
        gender: profile.gender,
        nationality: profile.nationality,
        language: profile.language,
      });
    }
  }, [profile]);

  useEffect(() => {
    checkStatus().catch(() => {});
  }, [checkStatus]);

  useEffect(() => {
    if (recorderState.isRecording && (recorderState.durationMillis ?? 0) >= MAX_DURATION_MS) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorderState.isRecording, recorderState.durationMillis]);

  const cloneStatus = status?.status ?? authProfile?.voice_clone_status ?? 'pending';
  const isRecording = recorderState.isRecording;

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('setupVoice.permissionRequired'), t('setupVoice.microphonePermissionRequired'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const stopRecording = async () => {
    try {
      const lastDuration = recorderState.durationMillis ?? 0;
      await recorder.stop();
      setRecordingDurationMs(lastDuration);
      const uri = recorder.uri;
      if (uri) setRecordingUri(uri);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const handleUpload = async () => {
    if (!recordingUri) return;
    if (recordingDurationMs > 0 && recordingDurationMs < MIN_DURATION_MS) {
      Alert.alert(t('setupVoice.tooShortTitle'), t('setupVoice.tooShortMessage'));
      return;
    }
    const info = await FileSystem.getInfoAsync(recordingUri);
    if (info.exists && info.size && info.size > 10 * 1024 * 1024) {
      Alert.alert(t('setupVoice.fileTooLarge'), t('setupVoice.voiceSizeLimit'));
      return;
    }
    try {
      await uploadClone(recordingUri);
      setRecordingUri(null);
    } catch (e: any) {
      Alert.alert(t('setupVoice.uploadFailed'), e.message);
    }
  };

  const handleDeleteVoice = () => {
    Alert.alert(t('setupVoice.deleteVoiceClone'), t('setupVoice.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: deleteClone },
    ]);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      Alert.alert(t('common.error'), t('signupWizard.displayNameRequired'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date)) {
      Alert.alert(t('common.error'), t('signupWizard.birthDateRequired'));
      return;
    }
    if (!form.nationality) {
      Alert.alert(t('common.error'), t('setupProfile.selectNationalityRequired'));
      return;
    }
    if (!form.language) {
      Alert.alert(t('common.error'), t('setupProfile.selectLanguageRequired'));
      return;
    }
    try {
      await upsertProfile({
        ...form,
        bio: profile?.bio ?? null,
        interests: profile?.interests ?? [],
      });
      router.back();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
  };

  const genderLabel = (g: typeof GENDER_OPTIONS[number]) => {
    if (g === 'male') return t('setupProfile.genderMale');
    if (g === 'female') return t('setupProfile.genderFemale');
    return t('setupProfile.genderOther');
  };

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={1}
        total={1}
        title={t('profile.editProfile')}
        subtitle={t('profile.editProfileSubtitle')}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={t('setupProfile.displayName')}
          value={form.display_name}
          onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))}
          placeholder={t('setupProfile.displayNamePlaceholder')}
          maxLength={50}
        />
        <Input
          label={t('setupProfile.birthDate')}
          value={form.birth_date}
          onChangeText={(v) => setForm((f) => ({ ...f, birth_date: formatBirthDate(v) }))}
          placeholder={t('setupProfile.birthDatePlaceholder')}
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>{t('setupProfile.gender')}</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((g) => (
            <Pressable
              key={g}
              style={[styles.genderBtn, form.gender === g && styles.genderActive]}
              onPress={() => setForm((f) => ({ ...f, gender: g }))}
            >
              <Text style={[styles.genderText, form.gender === g && styles.genderActiveText]}>
                {genderLabel(g)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('setupProfile.nationality')}</Text>
        <Pressable
          style={[styles.selectBtn, nationalityOpen && styles.selectBtnOpen]}
          onPress={() => setNationalityOpen((v) => !v)}
        >
          <Text style={[styles.selectText, !form.nationality && styles.selectPlaceholder]}>
            {form.nationality
              ? t(`nationalities.${form.nationality}`)
              : t('setupProfile.nationalityPlaceholder')}
          </Text>
          <Ionicons
            name={nationalityOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
        {nationalityOpen && (
          <View style={[styles.chipRow, styles.dropdownPanel]}>
            {SUPPORTED_NATIONALITIES.map(({ code, labelKey }) => {
              const selected = form.nationality === code;
              return (
                <Pressable
                  key={code}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => {
                    setForm((f) => ({ ...f, nationality: code as NationalityCode }));
                    setNationalityOpen(false);
                  }}
                >
                  <Text style={[styles.chipText, selected && styles.chipActiveText]}>
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>{t('setupProfile.language')}</Text>
        <Pressable
          style={[styles.selectBtn, languageOpen && styles.selectBtnOpen]}
          onPress={() => setLanguageOpen((v) => !v)}
        >
          <Text style={[styles.selectText, !form.language && styles.selectPlaceholder]}>
            {form.language ? t(`languages.${form.language}`) : t('setupProfile.languagePlaceholder')}
          </Text>
          <Ionicons
            name={languageOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
        {languageOpen && (
          <View style={[styles.chipRow, styles.dropdownPanel]}>
            {SUPPORTED_LANGUAGES.map(({ code, labelKey }) => {
              const selected = form.language === code;
              return (
                <Pressable
                  key={code}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => {
                    setForm((f) => ({ ...f, language: code as LanguageCode }));
                    setLanguageOpen(false);
                  }}
                >
                  <Text style={[styles.chipText, selected && styles.chipActiveText]}>
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 8 }]}>{t('profile.voiceSectionTitle')}</Text>
        <View style={styles.statusCard}>
          {cloneStatus === 'ready' && authProfile?.voice_sample_url ? (
            <AudioPlayer url={authProfile.voice_sample_url} showProgressBar tintColor={colors.like} />
          ) : cloneStatus === 'processing' ? (
            <>
              <Ionicons name="hourglass" size={36} color={colors.primary} />
              <Text style={styles.statusText}>{t('setupVoice.processing')}</Text>
            </>
          ) : recordingUri ? (
            <AudioPlayer url={recordingUri} showProgressBar tintColor={colors.success} />
          ) : (
            <View style={styles.recordRow}>
              <RecordRing
                isRecording={isRecording}
                durationMs={recorderState.durationMillis ?? 0}
                onPress={isRecording ? stopRecording : startRecording}
              />
              {isRecording && (
                <Text style={styles.timerText}>{formatDuration(recorderState.durationMillis ?? 0)}</Text>
              )}
            </View>
          )}
        </View>

        {cloneStatus === 'pending' || cloneStatus === 'failed' ? (
          recordingUri ? (
            <View style={styles.voiceActions}>
              <Button title={t('setupVoice.uploadVoice')} onPress={handleUpload} loading={voiceLoading} />
              <Button title={t('setupVoice.reRecord')} variant="outline" onPress={() => setRecordingUri(null)} />
            </View>
          ) : (
            <Text style={styles.hint}>{t('setupVoice.recordingGuide')}</Text>
          )
        ) : cloneStatus === 'ready' ? (
          <Button title={t('setupVoice.deleteVoiceClone')} variant="outline" onPress={handleDeleteVoice} />
        ) : null}

        <Button title={t('common.save')} onPress={handleSave} loading={loading} style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, marginBottom: 8 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 4 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  genderActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  genderText: { fontSize: 14, color: colors.textSecondary, textTransform: 'capitalize' },
  genderActiveText: { color: colors.white, fontFamily: fonts.semibold },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.card,
    marginBottom: 12,
  },
  selectBtnOpen: { borderColor: colors.primary, backgroundColor: colors.white },
  selectText: { fontSize: 16, color: colors.text, fontFamily: fonts.regular },
  selectPlaceholder: { color: colors.textLight },
  dropdownPanel: {
    padding: 12,
    marginTop: -4,
    marginBottom: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipActiveText: { color: colors.white, fontFamily: fonts.semibold },
  statusCard: {
    alignItems: 'center',
    padding: 22,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 12,
    ...shadows.soft,
  },
  statusText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: RECORD_ORANGE,
    fontVariant: ['tabular-nums'],
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    alignSelf: 'stretch',
  },
  voiceActions: { gap: 10, marginBottom: 8 },
});
