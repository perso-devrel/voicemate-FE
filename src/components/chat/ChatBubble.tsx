import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import type { Message } from '@/types';

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
  onPlayAudio?: (url: string) => void;
  onRetryAudio?: (messageId: string) => void;
}

export function ChatBubble({ message, isMine, onPlayAudio, onRetryAudio }: ChatBubbleProps) {
  const showTranslation = !isMine && message.translated_text;

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.theirs]}>
      <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirsBubble]}>
        <Text style={[styles.text, isMine && styles.mineText]}>
          {message.original_text}
        </Text>

        {showTranslation && (
          <Text style={styles.translation}>{message.translated_text}</Text>
        )}

        <View style={styles.footer}>
          {/* Audio controls */}
          {message.audio_status === 'ready' && message.audio_url && (
            <Pressable
              onPress={() => onPlayAudio?.(message.audio_url!)}
              style={styles.audioBtn}
            >
              <Ionicons name="play-circle" size={22} color={isMine ? colors.white : colors.primary} />
            </Pressable>
          )}
          {message.audio_status === 'processing' && (
            <View style={styles.audioBtn}>
              <Ionicons name="hourglass" size={16} color={colors.textSecondary} />
            </View>
          )}
          {message.audio_status === 'failed' && isMine && (
            <Pressable
              onPress={() => onRetryAudio?.(message.id)}
              style={styles.audioBtn}
            >
              <Ionicons name="refresh" size={18} color={colors.error} />
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  mine: {
    alignItems: 'flex-end',
  },
  theirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    padding: 10,
    borderRadius: 16,
  },
  mineBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirsBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  mineText: {
    color: colors.white,
  },
  translation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  audioBtn: {
    marginRight: 6,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  mineTime: {
    color: 'rgba(255,255,255,0.7)',
  },
});
