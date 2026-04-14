import { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { useChat } from '@/hooks/useChat';
import { colors } from '@/constants/colors';
import type { Message } from '@/types';

export default function ChatScreen() {
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
  const flatListRef = useRef<FlatList>(null);

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
      Alert.alert('Error', e.message);
    } finally {
      setSending(false);
    }
  };

  const handlePlayAudio = async (url: string) => {
    try {
      const player = createAudioPlayer(url);
      player.addListener('playbackStatusUpdate', (status) => {
        if (!status.playing && status.currentTime >= status.duration) {
          player.remove();
        }
      });
      player.play();
    } catch (e: any) {
      Alert.alert('Playback Error', e.message);
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

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Chat' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onStartReached={hasMore ? loadOlder : undefined}
          onStartReachedThreshold={0.1}
          contentContainerStyle={styles.messageList}
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

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textLight}
            maxLength={1000}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageList: {
    paddingVertical: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
