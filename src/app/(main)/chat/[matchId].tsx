import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Keyboard,
  Platform,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { AudioPlayer } from '@/components/chat/AudioPlayer';
import { IntimacyGauge } from '@/components/chat/IntimacyGauge';
import {
  EmotionPicker,
  EmotionChipRow,
  EMOTION_PICKER_ROW_HEIGHT,
} from '@/components/chat/EmotionPicker';
import { useChat } from '@/hooks/useChat';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { DEFAULT_EMOTION } from '@/constants/emotions';
import * as matchService from '@/services/matches';
import { calculateAge } from '@/utils/age';
import { countRoundTrips, photoRevealStage } from '@/utils/chat';
import type { Emotion, Message } from '@/types';

// Minimum padding under the chat input bar so the send button never sits
// directly on top of the Android gesture bar when useSafeAreaInsets() reports
// a bottom inset of 0 (seen on some edge-to-edge Android configurations).
const MIN_BOTTOM_SAFE_PAD = 12;

// Match modalCard { maxWidth: 360, width: '100%', backdrop padding: 24 }.
const MODAL_SLIDE_WIDTH = Math.min(360, Dimensions.get('window').width - 48);

// Visual breathing room between the last chat bubble and the input bar.
const EXTRA_BUBBLE_GAP = 16;

// Distance (px) from the bottom of the list within which a newly appended
// message will trigger an auto-scroll. Beyond this threshold we surface a
// "new messages" badge instead of yanking the viewport.
const NEAR_BOTTOM_THRESHOLD = 120;

export default function ChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    matchId,
    partnerPhoto: partnerPhotoParam,
    partnerName: partnerNameParam,
  } = useLocalSearchParams<{ matchId: string; partnerPhoto?: string; partnerName?: string }>();
  const [partnerPhoto, setPartnerPhoto] = useState<string | null>(
    partnerPhotoParam && partnerPhotoParam.length > 0 ? partnerPhotoParam : null,
  );
  const [partnerName, setPartnerName] = useState<string | null>(
    partnerNameParam && partnerNameParam.length > 0 ? partnerNameParam : null,
  );
  const [partnerPhotos, setPartnerPhotos] = useState<string[]>([]);
  const [partnerInterests, setPartnerInterests] = useState<string[]>([]);
  const [partnerBioAudio, setPartnerBioAudio] = useState<string | null>(null);
  const [partnerBirthDate, setPartnerBirthDate] = useState<string | null>(null);
  const [partnerNationality, setPartnerNationality] = useState<string | null>(null);
  const [partnerLanguage, setPartnerLanguage] = useState<string | null>(null);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);

  useEffect(() => {
    // BE /api/matches returns only basic MatchPartner fields. We pull the partner
    // from that list for photo/name/nationality/language (no single-match endpoint),
    // then call Supabase directly for birth_date/interests/bio_audio_url
    // (RLS "Anyone can read active profiles" permits it).
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await matchService.getMatches(50);
        if (cancelled) return;
        const found = list.find((m) => m.match_id === matchId);
        const partner = found?.partner;
        if (!partner) return;
        if (!partnerPhoto && partner.photos[0]) setPartnerPhoto(partner.photos[0]);
        if (!partnerName && partner.display_name) setPartnerName(partner.display_name);
        setPartnerPhotos(partner.photos ?? []);
        setPartnerNationality(partner.nationality ?? null);
        setPartnerLanguage(partner.language ?? null);
        const detail = await matchService.getPartnerDetail(partner.id);
        if (cancelled || !detail) return;
        setPartnerInterests(detail.interests);
        setPartnerBioAudio(detail.bio_audio_url);
        setPartnerBirthDate(detail.birth_date || null);
      } catch {
        // silent — partner details are best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);
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
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>(DEFAULT_EMOTION);
  const [emotionPickerOpen, setEmotionPickerOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  // Track previous list state so we only auto-scroll when a NEW message is
  // appended at the end — not when older messages are prepended via loadOlder.
  const prevLengthRef = useRef(0);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLastIdRef = useRef<string | null>(null);
  const initialScrolledRef = useRef(false);
  // Tracks whether the user is parked near the bottom of the list. Updated by
  // FlatList.onScroll. Starts true so the initial auto-scroll path runs.
  const isNearBottomRef = useRef(true);

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
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      markRead();
    }
  }, [messages.length, markRead]);

  // Initial scroll-to-bottom once messages finish loading for the first time.
  useEffect(() => {
    if (loading) return;
    if (initialScrolledRef.current) return;
    if (messages.length === 0) return;
    initialScrolledRef.current = true;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    });
  }, [loading, messages.length]);

  // Auto-scroll when a NEW message lands at the end (sent or received).
  // Skip when older messages are prepended via loadOlder — detected by the
  // first item's id changing while length grows.
  // When the user has scrolled away from the bottom and the appended message
  // is from the partner, surface a "new messages" badge instead of yanking
  // them back. Self-sent messages always scroll (the sender expects to see
  // their own message).
  useEffect(() => {
    const prevLen = prevLengthRef.current;
    const prevFirstId = prevFirstIdRef.current;
    const currLen = messages.length;
    const currFirstId = messages[0]?.id ?? null;
    const lastMessage = messages[currLen - 1];
    const currLastId = lastMessage?.id ?? null;

    if (currLen > prevLen) {
      const prependedOlder = prevFirstId !== null && currFirstId !== prevFirstId;
      const appendedNew = !prependedOlder && currLastId !== prevLastIdRef.current;
      if (appendedNew && initialScrolledRef.current) {
        const isMine = lastMessage?.sender_id === userId;
        if (isMine || isNearBottomRef.current) {
          flatListRef.current?.scrollToEnd({ animated: true });
          setNewMessagesCount(0);
        } else {
          setNewMessagesCount((c) => c + 1);
        }
      }
    }

    prevLengthRef.current = currLen;
    prevFirstIdRef.current = currFirstId;
    prevLastIdRef.current = currLastId;
  }, [messages, userId]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    if (nearBottom && newMessagesCount > 0) {
      setNewMessagesCount(0);
    }
  };

  const handleNewMessagesBadgePress = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setNewMessagesCount(0);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    const emotionForSend = selectedEmotion;
    // Reset emotion immediately so the user opts in for each message — avoids
    // accidentally sending a follow-up with the previous tone.
    setSelectedEmotion(DEFAULT_EMOTION);
    setEmotionPickerOpen(false);
    try {
      await send(trimmed, emotionForSend);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setSending(false);
    }
  };

  const handleEmotionSelect = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
    setEmotionPickerOpen(false);
  };

  const roundTrips = useMemo(() => countRoundTrips(messages), [messages]);
  const revealStage = photoRevealStage(roundTrips);
  const blurMainPhoto = revealStage === 'blurred';

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const isMine = item.sender_id === userId;
    const showAvatar = !isMine && (!prev || prev.sender_id !== item.sender_id);
    return (
      <ChatBubble
        message={item}
        isMine={isMine}
        partnerPhoto={partnerPhoto}
        showAvatar={showAvatar}
        blurAvatar={blurMainPhoto}
        onAvatarPress={() => setPartnerModalOpen(true)}
        onRetryAudio={retryAudio}
      />
    );
  };

  const keyboardOpen = kbHeight > 0;
  const bottomSafePad = keyboardOpen ? 8 : 8 + Math.max(insets.bottom, MIN_BOTTOM_SAFE_PAD);
  // Reserve vertical space under the list so the last message is never
  // occluded by the absolute-positioned input bar (approx 44 input + 10 top
  // padding + safe pad), plus EXTRA_BUBBLE_GAP for visual breathing room.
  // When the emotion chip row is expanded we add its height as well.
  const listBottomPad =
    54 +
    bottomSafePad +
    kbHeight +
    EXTRA_BUBBLE_GAP +
    (emotionPickerOpen ? EMOTION_PICKER_ROW_HEIGHT : 0);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chat.title') }} />
      <View style={styles.container}>
        <IntimacyGauge roundTrips={roundTrips} />
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          onStartReached={hasMore ? loadOlder : undefined}
          onStartReachedThreshold={0.1}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.messageList, { paddingBottom: listBottomPad }]}
          style={styles.list}
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 12 }} />
            ) : null
          }
        />

        {newMessagesCount > 0 && (
          <Pressable
            onPress={handleNewMessagesBadgePress}
            accessibilityRole="button"
            accessibilityLabel={t('chat.newMessagesBadge', { count: newMessagesCount })}
            hitSlop={8}
            style={({ pressed }) => [
              styles.newMessagesBadge,
              {
                bottom:
                  (keyboardOpen ? kbHeight + insets.bottom : 0) + 54 + bottomSafePad + 8,
              },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.newMessagesBadgeInner}
            >
              <Text style={styles.newMessagesBadgeText}>
                {t('chat.newMessagesBadge', { count: newMessagesCount })}
              </Text>
              <Ionicons name="arrow-down" size={14} color={colors.white} />
            </LinearGradient>
          </Pressable>
        )}

        <View
          style={[
            styles.inputDock,
            {
              bottom: keyboardOpen ? kbHeight + insets.bottom : 0,
            },
          ]}
        >
          {emotionPickerOpen && (
            <View style={styles.emotionRowWrapper}>
              <EmotionChipRow
                value={selectedEmotion}
                onSelect={handleEmotionSelect}
              />
            </View>
          )}
          <View
            style={[
              styles.inputBar,
              {
                paddingBottom: bottomSafePad,
              },
            ]}
          >
            <EmotionPicker
              value={selectedEmotion}
              expanded={emotionPickerOpen}
              onToggleExpanded={() => setEmotionPickerOpen((v) => !v)}
            />
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
      </View>

      <Modal
        visible={partnerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPartnerModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPartnerModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Pressable
              onPress={() => setPartnerModalOpen(false)}
              hitSlop={12}
              style={styles.modalClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            {revealStage === 'all' && partnerPhotos.length > 1 ? (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.modalPhoto}
                >
                  {partnerPhotos.map((uri, i) => (
                    <Image
                      key={`${uri}-${i}`}
                      source={{ uri }}
                      style={styles.modalPhotoSlide}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <View style={styles.swipeHint} pointerEvents="none">
                  <Ionicons name="chevron-forward" size={14} color={colors.white} />
                  <Text style={styles.swipeHintText}>{t('chat.swipeForMore')}</Text>
                </View>
              </View>
            ) : partnerPhoto ? (
              <Image
                source={{ uri: partnerPhoto }}
                style={styles.modalPhoto}
                resizeMode="cover"
                blurRadius={blurMainPhoto ? 40 : 0}
              />
            ) : (
              <View style={[styles.modalPhoto, styles.modalPhotoEmpty]}>
                <Ionicons name="person" size={72} color={colors.white} />
              </View>
            )}
            <ScrollView contentContainerStyle={styles.modalBody}>
              {partnerName && (
                <Text style={styles.modalName}>
                  {partnerName}
                  {partnerBirthDate ? `, ${calculateAge(partnerBirthDate)}` : ''}
                </Text>
              )}
              {(partnerNationality || partnerLanguage) && (
                <Text style={styles.modalMeta}>
                  {[partnerNationality, partnerLanguage].filter(Boolean).join(' / ')}
                </Text>
              )}
              {partnerBioAudio && <AudioPlayer url={partnerBioAudio} />}
              {partnerInterests.length > 0 && (
                <View style={styles.modalTags}>
                  {partnerInterests.map((tag, i) => (
                    <View key={`${tag}-${i}`} style={styles.modalTag}>
                      <Text style={styles.modalTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  inputDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.card,
    gap: 8,
  },
  emotionRowWrapper: {
    backgroundColor: colors.card,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderSoft,
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
  newMessagesBadge: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: radii.pill,
    overflow: 'hidden',
    ...shadows.glow,
  },
  newMessagesBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  newMessagesBadgeText: {
    color: colors.white,
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    ...shadows.soft,
  },
  modalPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.cardAlt,
  },
  modalPhotoSlide: {
    width: MODAL_SLIDE_WIDTH,
    aspectRatio: 3 / 4,
    backgroundColor: colors.cardAlt,
  },
  modalPhotoEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  swipeHintText: {
    fontSize: 11,
    color: colors.white,
    fontFamily: fonts.medium,
  },
  modalBody: {
    padding: 18,
    gap: 12,
  },
  modalName: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalTag: {
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTagText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
  },
  modalMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
    marginTop: -6,
  },
});
