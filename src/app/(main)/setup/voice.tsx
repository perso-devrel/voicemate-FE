import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useVoice } from '@/hooks/useVoice';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';

export default function VoiceSetupScreen() {
  const { status, loading, uploadClone, deleteClone, checkStatus } = useVoice();
  const profile = useAuthStore((s) => s.profile);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission', 'Microphone permission is required');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      recorder.record();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setRecordingUri(uri);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleUpload = async () => {
    if (!recordingUri) return;
    const info = await FileSystem.getInfoAsync(recordingUri);
    if (info.exists && info.size && info.size > 10 * 1024 * 1024) {
      Alert.alert('File Too Large', 'Voice sample must be under 10MB. Try a shorter recording.');
      return;
    }
    try {
      await uploadClone(recordingUri);
      setRecordingUri(null);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Voice Clone', 'This will remove your voice clone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteClone },
    ]);
  };

  const handleSkip = () => {
    router.replace('/(main)/(tabs)/discover');
  };

  const handleDone = () => {
    router.replace('/(main)/(tabs)/discover');
  };

  const cloneStatus = status?.status ?? profile?.voice_clone_status ?? 'pending';
  const isRecording = recorder.isRecording;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Clone</Text>
      <Text style={styles.subtitle}>
        Record a voice sample to create your AI voice clone
      </Text>

      <View style={styles.statusCard}>
        <Ionicons
          name={
            cloneStatus === 'ready'
              ? 'checkmark-circle'
              : cloneStatus === 'processing'
              ? 'hourglass'
              : cloneStatus === 'failed'
              ? 'alert-circle'
              : 'mic'
          }
          size={48}
          color={
            cloneStatus === 'ready'
              ? colors.success
              : cloneStatus === 'failed'
              ? colors.error
              : colors.primary
          }
        />
        <Text style={styles.statusText}>
          {cloneStatus === 'pending' && 'No voice clone yet'}
          {cloneStatus === 'processing' && 'Processing your voice...'}
          {cloneStatus === 'ready' && 'Voice clone is ready!'}
          {cloneStatus === 'failed' && 'Voice clone failed. Try again.'}
        </Text>
      </View>

      {cloneStatus === 'pending' || cloneStatus === 'failed' ? (
        <View style={styles.recordSection}>
          {!recordingUri ? (
            <Button
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
              onPress={isRecording ? stopRecording : startRecording}
              variant={isRecording ? 'danger' : 'primary'}
            />
          ) : (
            <View style={styles.actions}>
              <Button title="Upload Voice" onPress={handleUpload} loading={loading} />
              <Button
                title="Re-record"
                variant="outline"
                onPress={() => setRecordingUri(null)}
              />
            </View>
          )}
        </View>
      ) : cloneStatus === 'processing' ? (
        <Text style={styles.hint}>This may take a moment...</Text>
      ) : cloneStatus === 'ready' ? (
        <Button title="Delete Voice Clone" variant="outline" onPress={handleDelete} />
      ) : null}

      <View style={styles.bottom}>
        {cloneStatus === 'ready' ? (
          <Button title="Done" onPress={handleDone} />
        ) : (
          <Button title="Skip for now" variant="outline" onPress={handleSkip} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },
  statusCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  recordSection: {
    gap: 12,
  },
  actions: {
    gap: 10,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottom: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
});
