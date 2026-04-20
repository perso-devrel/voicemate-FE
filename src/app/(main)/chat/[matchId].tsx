import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createAudioPlayer } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { useChat } from '@/hooks/useChat';
import { colors, gradients } from '@/constants/colors';
import { createAudioPlayerManager } from '@/utils/audioPlayerManager';
import type { Message } from '@/types';

// Minimum padding under the chat input bar so the send button never sits
// directly on top of the Android gesture bar when useSafeAreaInsets() reports
// a bottom inset of 0 (seen on some edge-to-edge Android configurations).
const MIN_BOTTOM_SAFE_PAD = 12;

export default function ChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const {
    messages,
    loading,
    hasMore,
    userId,
    loadMessages,
    loadOlder,
    send,
    markRead,
    retryAudio,
  } = useChat(matchId!);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const audio = useMemo(() => createAudioPlayerManager(createAudioPlayer), []);

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

  useEffect(() => {
    // Safety net: leaving the chat screen (navigation away, soft unmount)
    // must never leave a native audio player attached.
    return () => audio.release();
  }, [audio]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      markRead();
    }
  }, [messages.length, markRead]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await send(trimmed);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSending(false);
    }
  };

  const handlePlayAudio = async (url: string) => {
    try {
      audio.play(url);
    } catch (e: any) {
      audio.release();
      Alert.alert(t('chat.playbackError'), e.message);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble
      message={item}
      isMine={item.sender_id === userId}
      onPlayAudio={handlePlayAudio}
      onRetryAudio={retryAudio}
    />
  );

  const keyboardOpen = kbHeight > 0;
  const bottomSafePad = keyboardOpen ? 8 : 8 + Math.max(insets.bottom, MIN_BOTTOM_SAFE_PAD);
  // Reserve vertical space under the list so the last message is never
  // occluded by the absolute-positioned input bar (approx 44 input + 10 top padding + safe pad).
  const listBottomPad = 54 + bottomSafePad + kbHeight;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chat.title') }} />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onStartReached={hasMore ? loadOlder : undefined}
          onStartReachedThreshold={0.1}
          contentContainerStyle={[styles.messageList, { paddingBottom: listBottomPad }]}
          style={styles.list}
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 12 }} />
            ) : null
          }
          onContentSizeChange={() => {
            if (!loading) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <View
          style={[
            styles.inputBar,
            {
              bottom: keyboardOpen ? kbHeight + insets.bottom : 0,
              paddingBottom: bottomSafePad,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor={colors.textLight}
            maxLength={1000}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={({ pressed }) => [
              styles.sendShell,
              pressed && { transform: [{ scale: 0.94 }] },
              (!text.trim() || sending) && styles.sendBtnDisabled,
            ]}
          >
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              <Ionicons name="send" size={20} color={colors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  messageList: {
    paddingTop: 10,
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.card,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sendShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendBtn: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
