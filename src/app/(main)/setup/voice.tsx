import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { useVoice } from "@/hooks/useVoice";
import { useAuthStore } from "@/stores/authStore";
import { colors } from "@/constants/colors";

export default function VoiceSetupScreen() {
    const { t } = useTranslation();
    const { status, loading, uploadClone, deleteClone, checkStatus } =
        useVoice();
    const profile = useAuthStore((s) => s.profile);
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const startRecording = async () => {
        try {
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(
                    t("setupVoice.permissionRequired"),
                    t("setupVoice.microphonePermissionRequired"),
                );
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            await recorder.prepareToRecordAsync();
            recorder.record();
        } catch (e: any) {
            Alert.alert(t("common.error"), e.message);
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
            Alert.alert(t("common.error"), e.message);
        }
    };

    const handleUpload = async () => {
        if (!recordingUri) return;
        const info = await FileSystem.getInfoAsync(recordingUri);
        if (info.exists && info.size && info.size > 10 * 1024 * 1024) {
            Alert.alert(
                t("setupVoice.fileTooLarge"),
                t("setupVoice.voiceSizeLimit"),
            );
            return;
        }
        try {
            await uploadClone(recordingUri);
            setRecordingUri(null);
        } catch (e: any) {
            Alert.alert(t("setupVoice.uploadFailed"), e.message);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            t("setupVoice.deleteVoiceClone"),
            t("setupVoice.deleteConfirm"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("common.delete"),
                    style: "destructive",
                    onPress: deleteClone,
                },
            ],
        );
    };

    const handleSkip = () => {
        router.replace("/(main)/(tabs)/discover");
    };

    const handleDone = () => {
        router.replace("/(main)/(tabs)/discover");
    };

    const cloneStatus =
        status?.status ?? profile?.voice_clone_status ?? "pending";
    const isRecording = recorderState.isRecording;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t("setupVoice.title")}</Text>
            <Text style={styles.subtitle}>{t("setupVoice.subtitle")}</Text>

            <View style={styles.statusCard}>
                {recordingUri &&
                (cloneStatus === "pending" || cloneStatus === "failed") ? (
                    <View style={styles.previewRow}>
                        <AudioPlayer url={recordingUri} showProgressBar />
                    </View>
                ) : isRecording ? (
                    <>
                        <Ionicons
                            name="mic"
                            size={48}
                            color={colors.error}
                        />
                        <Text style={styles.statusText}>
                            {t("setupVoice.recordingInProgress")}
                        </Text>
                    </>
                ) : (
                    <>
                        <Ionicons
                            name={
                                cloneStatus === "ready"
                                    ? "checkmark-circle"
                                    : cloneStatus === "processing"
                                      ? "hourglass"
                                      : cloneStatus === "failed"
                                        ? "alert-circle"
                                        : "mic"
                            }
                            size={48}
                            color={
                                cloneStatus === "ready"
                                    ? colors.success
                                    : cloneStatus === "failed"
                                      ? colors.error
                                      : colors.primary
                            }
                        />
                        <Text style={styles.statusText}>
                            {cloneStatus === "pending" &&
                                t("setupVoice.noVoiceClone")}
                            {cloneStatus === "processing" &&
                                t("setupVoice.processing")}
                            {cloneStatus === "ready" && t("setupVoice.ready")}
                            {cloneStatus === "failed" && t("setupVoice.failed")}
                        </Text>
                    </>
                )}
            </View>

            {cloneStatus === "pending" || cloneStatus === "failed" ? (
                <View style={styles.recordSection}>
                    {!recordingUri ? (
                        <>
                            <Button
                                title={
                                    isRecording
                                        ? t("setupVoice.stopRecording")
                                        : t("setupVoice.startRecording")
                                }
                                onPress={
                                    isRecording ? stopRecording : startRecording
                                }
                                variant={isRecording ? "danger" : "primary"}
                            />
                            <Text style={styles.guideText}>
                                {t("setupVoice.recordingGuide")}
                            </Text>
                            <ScrollView
                                style={styles.scriptBox}
                                contentContainerStyle={styles.scriptContent}
                            >
                                <Text style={styles.scriptTitle}>
                                    {t("setupVoice.exampleScriptTitle")}
                                </Text>
                                <Text style={styles.scriptText}>
                                    {t("setupVoice.exampleScript")}
                                </Text>
                            </ScrollView>
                        </>
                    ) : (
                        <View style={styles.actions}>
                            <Button
                                title={t("setupVoice.uploadVoice")}
                                onPress={handleUpload}
                                loading={loading}
                            />
                            <Button
                                title={t("setupVoice.reRecord")}
                                variant="outline"
                                onPress={() => setRecordingUri(null)}
                            />
                        </View>
                    )}
                </View>
            ) : cloneStatus === "processing" ? (
                <Text style={styles.hint}>
                    {t("setupVoice.processingHint")}
                </Text>
            ) : cloneStatus === "ready" ? (
                <Button
                    title={t("setupVoice.deleteVoiceClone")}
                    variant="outline"
                    onPress={handleDelete}
                />
            ) : null}

            <View style={styles.bottom}>
                {cloneStatus === "ready" ? (
                    <Button title={t("common.done")} onPress={handleDone} />
                ) : (
                    <Button
                        title={t("setupVoice.skipForNow")}
                        variant="outline"
                        onPress={handleSkip}
                    />
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
        fontWeight: "700",
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        marginBottom: 32,
    },
    statusCard: {
        alignItems: "center",
        padding: 24,
        backgroundColor: colors.surface,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    statusText: {
        fontSize: 16,
        fontWeight: "500",
        color: colors.text,
        textAlign: "center",
    },
    previewRow: {
        alignSelf: "stretch",
    },
    recordSection: {
        gap: 12,
    },
    guideText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 19,
        marginTop: 4,
    },
    scriptBox: {
        maxHeight: 270,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    scriptContent: {
        padding: 14,
    },
    scriptTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.primary,
        marginBottom: 6,
    },
    scriptText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 24,
    },
    actions: {
        gap: 10,
    },
    hint: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
    },
    bottom: {
        marginTop: "auto",
        paddingBottom: 20,
    },
});
