import { useState, useEffect } from "react";
import { fonts } from "@/constants/fonts";
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from "react-native";
import { router } from "expo-router";
import {
    useAudioRecorder,
    useAudioRecorderState,
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { useVoice } from "@/hooks/useVoice";
import { useAuthStore } from "@/stores/authStore";
import { colors } from "@/constants/colors";

const RECORD_ORANGE = "#FF8C42";
const REGISTERED_PINK = "#FF4F8B";
const MAX_DURATION_MS = 60_000; // ring fills toward this; auto-stops at this mark

const RING_SIZE = 56;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface RecordRingProps {
    isRecording: boolean;
    durationMs: number;
    onPress: () => void;
}

function RecordRing({ isRecording, durationMs, onPress }: RecordRingProps) {
    const progress = isRecording
        ? Math.min(durationMs / MAX_DURATION_MS, 1)
        : 0;
    return (
        <Pressable onPress={onPress} style={ringContainerStyle}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={colors.border}
                    strokeWidth={RING_STROKE}
                    fill="none"
                />
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
            <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={26}
                color={RECORD_ORANGE}
            />
        </Pressable>
    );
}

const ringContainerStyle = {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    alignSelf: "center" as const,
};

export default function VoiceSetupScreen() {
    const { t } = useTranslation();
    const { status, loading, uploadClone, deleteClone, checkStatus } =
        useVoice();
    const profile = useAuthStore((s) => s.profile);
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [recordingDurationMs, setRecordingDurationMs] = useState(0);
    const [scriptExpanded, setScriptExpanded] = useState(false);
    const MIN_DURATION_MS = 10_000; // business requirement: min 10s

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    // Auto-stop recording when it reaches MAX_DURATION_MS
    useEffect(() => {
        if (
            recorderState.isRecording &&
            (recorderState.durationMillis ?? 0) >= MAX_DURATION_MS
        ) {
            stopRecording();
        }
        // stopRecording is stable enough for this use; omit from deps to avoid re-running on identity change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recorderState.isRecording, recorderState.durationMillis]);

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
            const lastDuration = recorderState.durationMillis ?? 0;
            await recorder.stop();
            setRecordingDurationMs(lastDuration);
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
        if (recordingDurationMs > 0 && recordingDurationMs < MIN_DURATION_MS) {
            Alert.alert(
                t("setupVoice.tooShortTitle"),
                t("setupVoice.tooShortMessage"),
            );
            return;
        }
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

    const formatDuration = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t("setupVoice.title")}</Text>
            <Text style={styles.subtitle}>{t("setupVoice.subtitle")}</Text>

            <View style={styles.statusCard}>
                {cloneStatus === "ready" && profile?.voice_sample_url ? (
                    <AudioPlayer
                        url={profile.voice_sample_url}
                        showProgressBar
                        tintColor={REGISTERED_PINK}
                    />
                ) : cloneStatus === "processing" ? (
                    <>
                        <Ionicons name="hourglass" size={48} color={colors.primary} />
                        <Text style={styles.statusText}>
                            {t("setupVoice.processing")}
                        </Text>
                    </>
                ) : recordingUri ? (
                    <AudioPlayer
                        url={recordingUri}
                        showProgressBar
                        tintColor={colors.success}
                    />
                ) : (
                    <View style={styles.recordRow}>
                        <RecordRing
                            isRecording={isRecording}
                            durationMs={recorderState.durationMillis ?? 0}
                            onPress={isRecording ? stopRecording : startRecording}
                        />
                        {isRecording && (
                            <Text style={styles.timerText}>
                                {formatDuration(recorderState.durationMillis ?? 0)}
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {cloneStatus === "pending" || cloneStatus === "failed" ? (
                recordingUri ? (
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
                ) : (
                    <View style={styles.recordSection}>
                        <Text style={styles.guideText}>
                            {t("setupVoice.recordingGuide")}
                        </Text>
                        <View style={styles.scriptBox}>
                            <Pressable
                                style={styles.scriptHeader}
                                onPress={() => setScriptExpanded((v) => !v)}
                            >
                                <Text style={styles.scriptTitle}>
                                    {t("setupVoice.exampleScriptTitle")}
                                </Text>
                                <Ionicons
                                    name={scriptExpanded ? "chevron-up" : "chevron-down"}
                                    size={18}
                                    color={colors.primary}
                                />
                            </Pressable>
                            {scriptExpanded && (
                                <ScrollView
                                    style={styles.scriptScroll}
                                    contentContainerStyle={styles.scriptContent}
                                >
                                    <Text style={styles.scriptText}>
                                        {t("setupVoice.exampleScript")}
                                    </Text>
                                </ScrollView>
                            )}
                        </View>
                    </View>
                )
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
        fontFamily: fonts.bold,
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
        fontFamily: fonts.medium,
        color: colors.text,
        textAlign: "center",
    },
    timerText: {
        fontSize: 22,
        fontFamily: fonts.bold,
        color: RECORD_ORANGE,
        fontVariant: ["tabular-nums"],
    },
    recordRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        alignSelf: "stretch",
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
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
    },
    scriptHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    scriptScroll: {
        maxHeight: 240,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    scriptContent: {
        padding: 14,
    },
    scriptTitle: {
        fontSize: 13,
        fontFamily: fonts.semibold,
        color: colors.primary,
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
