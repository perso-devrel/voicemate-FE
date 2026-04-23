import type { Emotion } from '@/types';

export interface EmotionMeta {
  value: Emotion;
  emoji: string;
  /** i18next key under `chat.emotion.*`. */
  labelKey: string;
}

/**
 * Display order for the chip row. `neutral` is the default and is shown first
 * so users can re-select "no tone" without hunting.
 *
 * The 8 values mirror the BE Zod enum (`emotionSchema` in
 * `voicemate-BE-v2/src/schemas/message.ts`). v3 ElevenLabs audio tags only
 * accept these exact strings — do not add/rename without a BE change.
 */
export const EMOTION_OPTIONS: readonly EmotionMeta[] = [
  { value: 'neutral', emoji: '😐', labelKey: 'chat.emotion.neutral' },
  { value: 'happy', emoji: '😊', labelKey: 'chat.emotion.happy' },
  { value: 'sad', emoji: '😢', labelKey: 'chat.emotion.sad' },
  { value: 'angry', emoji: '😠', labelKey: 'chat.emotion.angry' },
  { value: 'surprised', emoji: '😲', labelKey: 'chat.emotion.surprised' },
  { value: 'excited', emoji: '🤩', labelKey: 'chat.emotion.excited' },
  { value: 'whispering', emoji: '🤫', labelKey: 'chat.emotion.whispering' },
  { value: 'laughing', emoji: '😂', labelKey: 'chat.emotion.laughing' },
] as const;

const EMOTION_META_MAP: Record<Emotion, EmotionMeta> = EMOTION_OPTIONS.reduce(
  (acc, meta) => {
    acc[meta.value] = meta;
    return acc;
  },
  {} as Record<Emotion, EmotionMeta>,
);

export function getEmotionMeta(value: Emotion): EmotionMeta {
  return EMOTION_META_MAP[value];
}

export const DEFAULT_EMOTION: Emotion = 'neutral';
