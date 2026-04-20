import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import type { Message } from '@/types';

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  onPlayAudio?: (url: string) => void;
  onRetryAudio?: (messageId: string) => void;
}

export function ChatBubble({ message, isMine, onPlayAudio, onRetryAudio }: ChatBubbleProps) {
  const showTranslation = !isMine && message.translated_text;

  const inner = (
    <>
      <Text style={[styles.text, isMine && styles.mineText]}>
        {message.original_text}
      </Text>

      {showTranslation && (
        <Text style={styles.translation}>{message.translated_text}</Text>
      )}

      <View style={styles.footer}>
        {message.audio_status === 'ready' && message.audio_url && (
          <Pressable
            onPress={() => onPlayAudio?.(message.audio_url!)}
            style={styles.audioBtn}
            accessibilityLabel="play audio"
          >
            <Ionicons
              name="play-circle"
              size={22}
              color={isMine ? 'rgba(255,255,255,0.95)' : colors.primary}
            />
          </Pressable>
        )}
        {message.audio_status === 'processing' && (
          <View style={styles.audioBtn}>
            <Ionicons
              name="hourglass"
              size={16}
              color={isMine ? 'rgba(255,255,255,0.85)' : colors.textSecondary}
            />
          </View>
        )}
        {message.audio_status === 'failed' && isMine && (
          <Pressable
            onPress={() => onRetryAudio?.(message.id)}
            style={styles.audioBtn}
            accessibilityLabel="retry audio"
          >
            <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}

        <Text style={[styles.time, isMine && styles.mineTime]}>
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        {isMine && message.read_at && (
          <Ionicons name="checkmark-done" size={14} color={colors.white} style={{ marginLeft: 4 }} />
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.mineBubble : styles.theirsBubble,
          shadows.soft,
        ]}
      >
        {inner}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    marginVertical: 4,
  },
  mine: {
    alignItems: 'flex-end',
  },
  theirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: radii.lg,
  },
  mineBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  theirsBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  text: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  mineText: {
    color: colors.white,
  },
  translation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  audioBtn: {
    marginRight: 6,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  mineTime: {
    color: 'rgba(255,255,255,0.8)',
  },
});
