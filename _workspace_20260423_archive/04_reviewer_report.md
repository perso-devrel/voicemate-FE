# 메시지 감정 옵션 (Emotion-Aware TTS) FE↔BE 통합 검증 리포트

> 검증일: 2026-04-23
> BE 경로: `C:\Users\EST-INFRA\voicemate-BE-v2`
> FE 경로: `C:\Users\EST-INFRA\voicemate-FE`
> 입력: `_workspace/01_analyzer_spec.md`, `_workspace/02_implementer_summary.md`

---

## 결과 요약

| # | 검증 항목 | 상태 | 비고 |
|---|---|---|---|
| 1 | Emotion enum 1:1 일치 (8종) | 통과 | BE Zod enum과 FE union 완전 동일 |
| 2 | Request body 필드명 (`text`, `emotion`) 일치 | 통과 | FE는 `emotion === 'neutral'` 시 omit, BE는 omit/neutral 모두 null로 정규화 |
| 3 | Response shape (`Message.emotion: Emotion \| null`) | 통과 | BE 컬럼은 `null` 또는 7종 enum, FE 타입과 일치 |
| 4 | Realtime payload `emotion` 컬럼 수신 | 통과 | Supabase row 그대로 전달, 별도 매핑 불필요 |
| 5 | DB CHECK 제약 (neutral 제외 7종) ↔ FE 처리 | 통과 | FE가 neutral은 omit → BE가 null로 저장, CHECK 통과 |
| 6 | Retry 시 emotion 자동 재사용 | 통과 | BE `/retry`가 저장된 emotion 사용, FE는 emotion 미전달 |
| 7 | text 1~1000자 maxLength 회귀 | 통과 | FE `<TextInput maxLength={1000}>` 유지, BE Zod도 동일 |
| 8 | audio_status 처리 변경 없음 (회귀) | 통과 | ChatBubble의 `pending`/`processing`/`ready`/`failed` 분기 그대로 |
| 9 | 엔드포인트 path 일치 | 통과 | BE는 `/api/matches`에 message router 마운트, FE도 동일 prefix 사용 |
| 10 | i18n 8개 라벨 + toggleLabel | 통과 | ko.ts/en.ts 동일 키 8개 + `emotionPicker.toggleLabel` |

**전체 통과** — 발견된 CRITICAL/WARNING 이슈 없음. 1개의 INFO 권고 항목만 존재.

---

## 1. Emotion enum 1:1 비교 (CRITICAL 우선)

| index | BE (`src/schemas/message.ts:3-12`) | FE (`src/types/index.ts:129-137`) | FE 메타 (`src/constants/emotions.ts:18-27`) |
|---|---|---|---|
| 1 | `'neutral'` | `'neutral'` | `{ value: 'neutral', emoji: '😐', labelKey: 'chat.emotion.neutral' }` |
| 2 | `'happy'` | `'happy'` | `{ value: 'happy', emoji: '😊', labelKey: 'chat.emotion.happy' }` |
| 3 | `'sad'` | `'sad'` | `{ value: 'sad', emoji: '😢', labelKey: 'chat.emotion.sad' }` |
| 4 | `'angry'` | `'angry'` | `{ value: 'angry', emoji: '😠', labelKey: 'chat.emotion.angry' }` |
| 5 | `'surprised'` | `'surprised'` | `{ value: 'surprised', emoji: '😲', labelKey: 'chat.emotion.surprised' }` |
| 6 | `'excited'` | `'excited'` | `{ value: 'excited', emoji: '🤩', labelKey: 'chat.emotion.excited' }` |
| 7 | `'whispering'` | `'whispering'` | `{ value: 'whispering', emoji: '🤫', labelKey: 'chat.emotion.whispering' }` |
| 8 | `'laughing'` | `'laughing'` | `{ value: 'laughing', emoji: '😂', labelKey: 'chat.emotion.laughing' }` |

- 누락/오타/추가 값 없음.
- 순서 차이는 의미 없음(둘 다 enum / union).
- BE의 추가 검증: DB CHECK constraint(`004_message_emotion.sql`)는 `neutral` 제외 7종만 허용 → FE가 `'neutral'`을 omit하므로 BE에서 null 정규화(`message.ts:60-61`) → CHECK 통과. **모순 없음**.

---

## 2. Request body 일치 (POST `/:matchId/messages`)

**BE 수신 (`src/routes/message.ts:56-61`):**
```ts
router.post('/:matchId/messages', validateBody(sendMessageSchema), async (req, res) => {
  const { matchId } = req.params;
  const { text, emotion } = req.body as { text: string; emotion?: Emotion };
  const storedEmotion: Exclude<Emotion, 'neutral'> | null =
    emotion && emotion !== 'neutral' ? emotion : null;
```

**BE Zod (`src/schemas/message.ts:14-17`):**
```ts
export const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  emotion: emotionSchema.optional(),
});
```

**FE 전송 (`src/services/messages.ts:14-24`):**
```ts
export async function sendMessage(matchId, text, emotion?) {
  const body = emotion && emotion !== 'neutral' ? { text, emotion } : { text };
  return api.post<Message>(`/api/matches/${matchId}/messages`, body);
}
```

**검증 결과:**
- 필드명 `text`, `emotion` 양쪽 동일.
- FE가 `text`를 trim하지 않고 보내지만(`useChat.send`도 raw text 전달), BE가 Zod에서 trim → OK. (`ChatScreen.handleSend`에서 `trimmed = text.trim()` 후 send에 trimmed를 넘기므로 실질적으로 trim 적용됨, `[matchId].tsx:223-234`).
- FE가 `emotion === 'neutral'`일 때 body에서 omit. BE는 omit과 neutral 모두 동일하게 `null`로 저장(`message.ts:60-61`). 동작 일치.
- FE의 1자~1000자 사전 검증: `TextInput maxLength={1000}` + `if (!trimmed) return` (`[matchId].tsx:225`) — BE 제약 사전 차단.

**경계 케이스 점검:**
- 사용자가 `[whispering]` 같은 토큰을 본문에 직접 입력해도 BE가 막지 않음(분석 스펙 §ElevenLabs §FE 영향에 명시). FE도 별도 escape 안 함. **현재는 의도된 동작**(스펙 권고 수준이며 강제 차단 아님). → INFO 항목으로 기록.

---

## 3. Response shape & Message 타입 정합

**BE INSERT 응답 (`src/routes/message.ts:111-131`):**
```ts
const { data: message } = await supabase.from('messages').insert({
  match_id, sender_id, original_text, original_language,
  translated_language, emotion: storedEmotion,
  audio_status: sender.elevenlabs_voice_id ? 'processing' : 'pending',
}).select().single();
res.status(201).json(message);
```
→ Supabase의 `select()` 결과를 그대로 반환하므로 `messages` 테이블의 모든 컬럼(`emotion` 포함, 7종 또는 null)이 응답에 포함됨.

**FE 타입 (`src/types/index.ts:141-155`):**
```ts
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  original_text: string;
  original_language: string;
  translated_text: string | null;
  translated_language: string | null;
  audio_url: string | null;
  audio_status: AudioStatus;
  emotion: Emotion | null;  // BE가 'neutral'을 null로 저장하므로 OK
  read_at: string | null;
  created_at: string;
}
```

**BE 타입 (`src/types/index.ts:53-66`)와 비교:** 필드명/타입 모두 1:1 일치. FE는 `Emotion | null`이고 BE도 `Emotion | null`. 단, 실제 DB에서 emotion 값으로 'neutral'이 들어가는 일은 절대 없으므로(BE가 항상 null로 정규화), FE에서 `message.emotion === 'neutral'` 체크는 사실상 dead code지만 방어적 코드로 유효(`ChatBubble.tsx:112`).

---

## 4. Realtime 구독 영향

**FE (`src/services/realtime.ts:35-66`):**
- INSERT/UPDATE 이벤트 모두 `payload.new as Message`로 캐스팅.
- Supabase Realtime은 행의 모든 컬럼을 payload에 자동 포함하므로, 마이그레이션 `004`로 추가된 `emotion` 컬럼도 자동으로 흘러옴.
- FE 타입에 `emotion` 필드를 추가했으므로 별도 코드 변경 없이 `useChat`의 setMessages 머지 로직(`useChat.ts:97-110`)에서 그대로 처리됨.

**검증:** 통과. Realtime row 매핑에 손이 갈 곳 없음.

---

## 5. DB CHECK 제약과 FE 검증 정합

**BE 마이그레이션 (`004_message_emotion.sql`):**
```sql
alter table public.messages
  add column emotion text
    check (emotion in ('happy', 'sad', 'angry', 'surprised', 'excited', 'whispering', 'laughing'));
```
- `neutral`은 CHECK에 포함되지 않음 → 'neutral' 문자열을 INSERT하면 DB 에러.
- BE가 `message.ts:60-61`에서 'neutral'/undefined를 모두 `null`로 정규화하여 INSERT → CHECK 우회.

**FE 동작 검증:**
- `messages.ts:21-22`에서 'neutral'은 body에서 제거 → BE가 undefined로 받음 → null 저장. ✅
- `ChatScreen.handleSend`(`[matchId].tsx:228-234`)는 `selectedEmotion`을 그대로 service에 전달. service에서 'neutral' 분기. 일관됨. ✅

**검증:** 통과. CHECK 위배 가능성 없음.

---

## 6. Retry 흐름

**BE (`src/routes/message.ts:215-222`):**
```ts
processMessageAudio(
  messageId, message.original_text, sender.elevenlabs_voice_id,
  message.original_language, message.translated_language,
  message.emotion ?? null   // 저장된 emotion 재사용
);
```
- 라우트 path: `POST /:messageId/retry` → `app.use('/api/matches', messageRoutes)` 마운트(`index.ts:36`) → 최종 path = `POST /api/matches/:messageId/retry`.

**FE (`src/services/messages.ts:30-32`):**
```ts
export async function retryAudio(messageId: string) {
  return api.post<RetryResponse>(`/api/matches/${messageId}/retry`);
}
```
- path 일치. ✅
- body 미전달. BE는 `req.body`를 보지 않으므로 OK. ✅
- emotion 재선택 UI 없음 (`ChatBubble.tsx`의 retry 핸들러는 messageId만 전달). ✅

**검증:** 통과.

---

## 7. text 1~1000자 maxLength 회귀

- BE: `z.string().trim().min(1).max(1000)` (변경 없음).
- FE: `<TextInput maxLength={1000} />` (`[matchId].tsx:369`), `if (!trimmed)` 가드(225). 변경 없음.

**검증:** 통과.

---

## 8. audio_status 처리 회귀

- BE 동작: 기존과 동일하게 `pending` → (TTS 시) `processing` → `ready`/`failed`. 본 기능은 emotion만 추가됨.
- FE ChatBubble 분기(`ChatBubble.tsx:44-70`): `ready`/`processing`/`failed` 모두 처리. `pending` 케이스는 명시 분기 없음(기존 코드 그대로) — 음성 클론 미보유 발신자의 경우 텍스트만 표시됨. 본 PR의 회귀 영역 아님.

**검증:** 통과(기능 영향 없음).

---

## 9. 엔드포인트 path 일치

| Method | BE 라우트 (mount + path) | FE 호출 path | 일치 |
|---|---|---|---|
| POST | `/api/matches/:matchId/messages` | `/api/matches/${matchId}/messages` | ✅ |
| GET | `/api/matches/:matchId/messages` | `/api/matches/${matchId}/messages?limit=&before=` | ✅ |
| PATCH | `/api/matches/:matchId/messages/read` | `/api/matches/${matchId}/messages/read` | ✅ |
| POST | `/api/matches/:messageId/retry` | `/api/matches/${messageId}/retry` | ✅ |

> 분석 스펙 §47 표에는 `/api/messages/...`로 잘못 표기되어 있으나, 실제 마운트 경로는 `/api/matches`임(`src/index.ts:36`). FE가 올바른 `/api/matches`를 사용하므로 런타임 문제 없음.

---

## 10. i18n 일치

- ko.ts (`136-148`): `chat.emotion.{neutral|happy|sad|angry|surprised|excited|whispering|laughing}` 8개 한글 라벨 + `emotionPicker.toggleLabel: "감정 선택"` ✅
- en.ts (`136-148`): 동일 키 8개 영문 라벨 + `emotionPicker.toggleLabel: "Choose emotion"` ✅
- `EMOTION_OPTIONS`의 `labelKey`와 1:1 매핑됨.

**검증:** 통과.

---

## 발견된 문제

### CRITICAL: 없음
### WARNING: 없음

### [INFO] 사용자 입력 본문에 `[...]` 토큰 노출

- 위치: `src/app/(main)/chat/[matchId].tsx:363-371` (TextInput), 그리고 BE `src/services/elevenlabs.ts:44`에서 `[${emotion}] ${text}` 프리픽스 부착.
- 현상: 사용자가 본문에 `[laughing]` 같은 텍스트를 직접 적으면 ElevenLabs v3가 추가 audio tag로 해석할 가능성이 있음(스펙 1번 분석 §ElevenLabs §FE 영향).
- 영향: 정상 사용 시 거의 발생하지 않음. 의도적 어뷰징 가능성도 BE 정책에서 막지 않음.
- 권고: 현재 변경 범위에서는 처리 불필요. 향후 BE 측에서 `text.replace(/\[[^\]]*\]/g, ...)` 같은 sanitize를 검토하거나, FE에서 문자 입력 시 안내 메시지를 띄우는 것을 옵션으로 고려.

---

## 통과 항목 요약

- Emotion enum 8종 BE↔FE 완전 일치 (오타/누락/추가 없음).
- Request body shape, Response shape, Message 타입 모두 1:1 정합.
- DB CHECK 제약과 FE 'neutral' omit 동작이 정확히 맞물림.
- Retry 라우트가 저장된 emotion 자동 재사용, FE는 emotion 재전송 안 함.
- 엔드포인트 path 4개 모두 BE 마운트(`/api/matches`)와 일치.
- Realtime payload에 emotion 컬럼 자동 포함 → FE 별도 매핑 불필요.
- i18n ko/en 8개 라벨 + toggleLabel 동일 키.
- 기존 `text 1~1000자`, `audio_status 4상태` 회귀 없음.

---

## 결론

**FE↔BE 통합 정합성 검증 통과.** Critical/Warning 없음. INFO 1건은 본 기능 범위 외 권고 사항. 추가 수정 필요 없음.
